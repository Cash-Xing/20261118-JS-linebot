import 'dotenv/config'
import linebot from 'linebot'
import commandFarm from './commands/farm.js'
import commandUbike from './commands/ubike.js'
import commandWda from './commands/wda.js'
import commandParking, { askParkingLocation, consumeParkingRequest } from './commands/parking.js'

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
      askParkingLocation(event)
    }
  } else if (event.message.type === 'location') {
    if (consumeParkingRequest(event.source.userId)) {
      commandParking(event)
    } else {
      commandUbike(event)
    }
  }
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})
