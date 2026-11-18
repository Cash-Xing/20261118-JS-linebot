// 使用者輸入查詢指令後，等他傳位置；超過 10 分鐘就失效
const WAIT_MS = 10 * 60 * 1000
const waiting = new Map()

// 請使用者傳送位置，並記住他是要查哪一種資料（例如 parking、bus）
export const askLocation = async (event, kind, text) => {
  try {
    waiting.set(event.source.userId, { kind, time: Date.now() })
    await event.reply({
      type: 'text',
      text,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'location',
              label: '傳送位置',
            },
          },
        ],
      },
    })
  } catch (error) {
    console.error(error)
  }
}

// 取得這位使用者在傳位置前是在查哪一種資料；沒有或已過期就回傳 null，並清除等待狀態
export const takeLocationRequest = (userId) => {
  const request = waiting.get(userId)
  waiting.delete(userId)
  return request && Date.now() - request.time < WAIT_MS ? request.kind : null
}
