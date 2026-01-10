export const A4L_WIDTH = 297
export const A4L_HEIGHT = 210
export const A6L_WIDTH = 148
export const A6L_HEIGHT = 105

export const COLUMN_RATIOS = {
  time: 0.21,
  event: 0.31,
  group: 0.07,
  stage: 0.18,
  station: 0.07,
  staff: 0.16,
} as const

export const LAYOUT = {
  fontSizeMultiplier: 2.2,
  xPaddingRatio: 0.1,
  yPaddingRatio: 0.78,
  iconSizeRatio: 0.9,
  iconSpacingRatio: 0.2,
} as const

export const EVENT_MAP: Record<string, string> = {
  '222': '2x2x2',
  '333': '3x3x3',
  '333fm': '3x3 Fewest Moves',
  '333ft': '3x3 With Feet',
  '333oh': '3x3 One-Handed',
  '333mbf': '3x3 Multi-Blind',
  '333bf': '3x3 Blindfolded',
  '444bf': '4x4 Blindfolded',
  '555bf': '5x5 Blindfolded',
  '444': '4x4x4',
  '555': '5x5x5',
  '666': '6x6x6',
  '777': '7x7x7',
  'sq1': 'Square-1',
  'clock': 'Clock',
  'minx': 'Megaminx',
  'pyram': 'Pyraminx',
  'skewb': 'Skewb',
}

export const EVENT_ICON_MAP: Record<string, string> = {
  '222': '\uE600',
  '333': '\uE601',
  '333bf': '\uE602',
  '333fm': '\uE603',
  '333ft': '\uE604',
  '333mbf': '\uE605',
  '333oh': '\uE606',
  '444': '\uE607',
  '444bf': '\uE608',
  '555': '\uE609',
  '555bf': '\uE60A',
  '666': '\uE60B',
  '777': '\uE60C',
  'clock': '\uE60D',
  'minx': '\uE60E',
  'pyram': '\uE60F',
  'skewb': '\uE610',
  'sq1': '\uE611',
}

export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const ASSET_PATHS = {
  backgroundImage: '/images/badge-bg.png',
  siLogo: '/images/si-logo.png',
  wcaLogo: '/images/wca-logo.png',
  chineseTaipeiFlag: '/images/chinese-taipei-flag.png',
  cubingIconsFont: '/fonts/cubing-icons.ttf',
} as const

export const FONT_URLS: Record<string, string> = {
  'NotoSans-Regular': 'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
  'NotoSans-Bold': 'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf',
  'cubing-icons': '/fonts/cubing-icons.ttf',
  'NotoSansArabic': 'https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfL2uvuw.ttf',
  'NotoSansThai': 'https://fonts.gstatic.com/s/notosansthai/v29/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU3NqpzE.ttf',
  'NotoSansArmenian': 'https://fonts.gstatic.com/s/notosansarmenian/v47/ZgN0jOZKPa7CHqq0h37c7ReDUubm2SEdFXp7ig73qtTY5idb74R9UdM3y2nZLooWaK0i.ttf',
  'NotoSansGeorgian': 'https://fonts.gstatic.com/s/notosansgeorgian/v48/PlIaFke5O6RzLfvNNVSitxkr76PRHBC4Ytyq-Gof7PUs4S7zWn-8YDB09HFNdpsAy1j-.ttf',
  'NotoSansSC': 'https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCnYw.ttf',
}
