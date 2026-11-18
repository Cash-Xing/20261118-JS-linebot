const row = (label, text) => {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: label,
        color: '#aaaaaa',
        size: 'sm',
        flex: 2,
      },
      {
        type: 'text',
        text,
        wrap: true,
        color: '#666666',
        size: 'sm',
        flex: 5,
      },
    ],
  }
}

export default (value) => {
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: value.name,
          weight: 'bold',
          size: 'lg',
          wrap: true,
        },
        {
          type: 'text',
          text: `${Math.round(value.distance * 100) / 100} 公里`,
          color: '#888888',
          size: 'sm',
          margin: 'sm',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            row(
              '剩餘車位',
              value.availableCar === null ? '無即時資料' : `${value.availableCar} 格`,
            ),
            row('總車位', value.totalCar ? `${value.totalCar} 格` : '未提供'),
            row('收費', value.payment || '未提供'),
            row('地址', value.address || '未提供'),
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: '導航',
            uri: `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`,
          },
        },
      ],
      flex: 0,
    },
  }
}
