const busRow = (bus) => {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: bus.route,
        weight: 'bold',
        size: 'sm',
        flex: 2,
        wrap: true,
      },
      {
        type: 'text',
        text: bus.destination || '未提供',
        color: '#666666',
        size: 'sm',
        flex: 4,
        wrap: true,
      },
      {
        type: 'text',
        text: bus.eta,
        weight: 'bold',
        size: 'sm',
        align: 'end',
        flex: 2,
        wrap: true,
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
          text: `${Math.round(value.distance * 1000)} 公尺 ・ 共 ${value.count} 班即將經過`,
          color: '#888888',
          size: 'sm',
          margin: 'sm',
          wrap: true,
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents:
            value.buses.length > 0
              ? value.buses.map((bus) => busRow(bus))
              : [
                  {
                    type: 'text',
                    text: '目前沒有即時班車資訊',
                    color: '#aaaaaa',
                    size: 'sm',
                    wrap: true,
                  },
                ],
        },
      ],
    },
  }
}
