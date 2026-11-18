import 'dotenv/config'
import linebot from 'linebot'
import commandFarm from './commands/farm.js'
import commandUbike from './commands/ubike.js'
import commandWda from './commands/wda.js'
import commandParking from './commands/parking.js'
import commandBus from './commands/bus.js'
import { askLocation, takeLocationRequest } from './utils/locationRequest.js'

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
})

bot.on('message', (event) => {
  if (event.message.type === 'text') {
    if (event.message.text.startsWith('查農場')) {
      commandFarm(event)
    } else if (event.message.text === 'wda') {
      commandWda(event)
    } else if (event.message.text === '附近停車場') {
      askLocation(event, 'parking', '請傳送你的位置，我幫你找附近的停車場')
    } else if (event.message.text === '附近公車') {
      askLocation(event, 'bus', '請傳送你的位置，我幫你找附近的公車站牌')
    }
  } else if (event.message.type === 'location') {
    const request = takeLocationRequest(event.source.userId)
    if (request === 'parking') {
      commandParking(event)
    } else if (request === 'bus') {
      commandBus(event)
    } else {
      commandUbike(event)
    }
  }
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})
