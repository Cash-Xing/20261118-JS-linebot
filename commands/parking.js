import axios from 'axios'
import proj4 from 'proj4'
import { distance } from '../utils/distance.js'
import templateParking from '../templates/parking.js'

// 新北市停車場的座標是 TWD97 (TM2) 平面座標，要先轉成經緯度才能算距離
proj4.defs(
  'EPSG:3826',
  '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
)

// 路外公共停車場基本資訊（名稱、地址、車位數、座標）
const PLACES_URL = 'https://data.ntpc.gov.tw/api/datasets/b1464ef0-9c7c-4a6f-abf7-6bdf32847e68/json'
// 路外公有停車場即時剩餘車位數，用 ID 和基本資訊對應
const SPACES_URL = 'https://data.ntpc.gov.tw/api/datasets/e09b35a5-a738-48cc-b0f5-570b67ad9c78/json'
const PAGE_SIZE = 1000

// 每頁最多 1000 筆，一直抓到空頁為止
const fetchAll = async (url) => {
  const rows = []
  for (let page = 0; ; page++) {
    const { data } = await axios.get(url, { params: { page, size: PAGE_SIZE } })
    if (data.length === 0) return rows
    rows.push(...data)
  }
}

export default async (event) => {
  try {
    const [places, spaces] = await Promise.all([fetchAll(PLACES_URL), fetchAll(SPACES_URL)])

    const availableCar = new Map(spaces.map((value) => [value.ID, value.AVAILABLECAR]))
    const { latitude, longitude } = event.message

    const bubbles = places
      .filter((value) => value.TW97X && value.TW97Y)
      .map((value) => {
        const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [
          Number(value.TW97X),
          Number(value.TW97Y),
        ])
        const car = availableCar.get(value.ID)
        return {
          name: value.NAME,
          address: value.ADDRESS,
          payment: value.PAYEX,
          totalCar: value.TOTALCAR,
          // -9 代表該停車場目前沒有提供即時車位
          availableCar: car === undefined || car === '-9' ? null : car,
          lat,
          lng,
          distance: distance(lat, lng, latitude, longitude, 'K'),
        }
      })
      .sort((a, b) => {
        return a.distance - b.distance
      })
      .slice(0, 3)
      .map((value) => {
        return templateParking(value)
      })

    if (bubbles.length === 0) {
      await event.reply('查無停車場資料')
      return
    }

    await event.reply({
      type: 'flex',
      altText: '附近停車場查詢結果',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    })
  } catch (error) {
    console.error(error)
  }
}
