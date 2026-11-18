import axios from 'axios'
import { distance } from '../utils/distance.js'
import templateBus from '../templates/bus.js'

// 公車站位資訊：每一筆是「某路線在某一站」，同一個站牌會有很多筆
const STOPS_URL = 'https://data.ntpc.gov.tw/api/datasets/34b402a8-53d9-483d-9406-24a682c2d6dc/json'
// 公車路線清單：路線編號對應路線名稱與起訖站
const ROUTES_URL = 'https://data.ntpc.gov.tw/api/datasets/0ee4e6bf-cee6-4ec8-8fe1-71f544015127/json'
// 公車預估到站時間：用站位 ID 對應，時間是剩餘秒數（負數是狀態代碼）
const ETA_URL = 'https://data.ntpc.gov.tw/api/datasets/07f7ccb3-ed00-43c4-966d-08e9dab24e95/json'

const PAGE_SIZE = 1000
const PARALLEL_PAGES = 8
// 站牌和路線資料很少變動，快取一天；到站時間變動快，只快取 30 秒
const STOP_CACHE_MS = 24 * 60 * 60 * 1000
const ETA_CACHE_MS = 30 * 1000
const NEARBY_KM = 1
const SHOW_STOPS = 3
const SHOW_BUSES = 5

// 一次平行抓好幾頁；只要有一頁不滿 1000 筆，就代表已經到最後一頁
const fetchAll = async (url) => {
  const rows = []
  for (let start = 0; ; start += PARALLEL_PAGES) {
    const pages = await Promise.all(
      Array.from({ length: PARALLEL_PAGES }, (_, i) =>
        axios.get(url, { params: { page: start + i, size: PAGE_SIZE } }).then((res) => res.data),
      ),
    )
    for (const data of pages) rows.push(...data)
    if (pages.some((data) => data.length < PAGE_SIZE)) return rows
  }
}

// 快取「抓取的結果」：同時來的查詢共用同一次抓取；過期後重新抓，失敗時下次再試
const cached = (load, ttl) => {
  let entry = null
  return () => {
    if (!entry || Date.now() - entry.at > ttl) {
      const promise = load()
      entry = { at: Date.now(), promise }
      promise.catch(() => {
        if (entry?.promise === promise) entry = null
      })
    }
    return entry.promise
  }
}

const loadStops = cached(async () => {
  const [stops, routes] = await Promise.all([fetchAll(STOPS_URL), fetchAll(ROUTES_URL)])

  // 同一個 stoplocationid 是同一個實體站牌，把經過它的所有路線站位合併起來
  const byLocation = new Map()
  for (const stop of stops) {
    if (!byLocation.has(stop.stoplocationid)) {
      byLocation.set(stop.stoplocationid, {
        name: stop.namezh,
        lat: Number(stop.latitude),
        lng: Number(stop.longitude),
        stopIds: [],
      })
    }
    byLocation.get(stop.stoplocationid).stopIds.push(stop.id)
  }

  return {
    places: [...byLocation.values()],
    routes: new Map(routes.map((route) => [route.id, route])),
  }
}, STOP_CACHE_MS)

// 回傳 Map：站位 ID → 即將到站的班次 [{ routeid, goback, seconds }]
const loadEta = cached(async () => {
  const records = await fetchAll(ETA_URL)
  const byStop = new Map()
  for (const record of records) {
    // 只有純數字才是剩餘秒數；負數是狀態代碼（例如未發車、不停靠），略過
    if (!/^\d+$/.test(record.estimatetime)) continue
    if (!byStop.has(record.stopid)) byStop.set(record.stopid, [])
    byStop.get(record.stopid).push({
      routeid: record.routeid,
      goback: record.goback,
      seconds: Number(record.estimatetime),
    })
  }
  return byStop
}, ETA_CACHE_MS)

// 先載入站牌資料，讓第一次查詢不用等太久
loadStops().catch((error) => console.error('公車站牌資料預先載入失敗', error.message))

const routeLabel = (bus, routes) => {
  const route = routes.get(bus.routeid)
  // goback 0 是去程，往終點站；1 是返程，往起點站
  const destination = String(bus.goback) === '0' ? route?.destinationzh : route?.departurezh
  return {
    route: route?.namezh ?? bus.routeid,
    destination: destination ? `往 ${destination}` : '',
  }
}

const etaText = (seconds) => {
  return seconds < 60 ? '進站中' : `${Math.round(seconds / 60)} 分鐘`
}

export default async (event) => {
  try {
    const { latitude, longitude } = event.message
    const [{ places, routes }, byStop] = await Promise.all([loadStops(), loadEta()])

    const nearest = places
      .map((place) => {
        return { ...place, distance: distance(place.lat, place.lng, latitude, longitude, 'K') }
      })
      .filter((place) => place.distance <= NEARBY_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, SHOW_STOPS)

    if (nearest.length === 0) {
      await event.reply(`附近 ${NEARBY_KM} 公里內查無公車站牌`)
      return
    }

    const stops = nearest.map((place) => {
      const buses = place.stopIds
        .flatMap((id) => byStop.get(id) ?? [])
        .sort((a, b) => a.seconds - b.seconds)

      return {
        name: place.name,
        distance: place.distance,
        count: buses.length,
        buses: buses.slice(0, SHOW_BUSES).map((bus) => {
          return { ...routeLabel(bus, routes), eta: etaText(bus.seconds) }
        }),
      }
    })

    await event.reply({
      type: 'flex',
      altText: '附近公車站牌查詢結果',
      contents: {
        type: 'carousel',
        contents: stops.map((value) => templateBus(value)),
      },
    })
  } catch (error) {
    console.error(error)
  }
}
