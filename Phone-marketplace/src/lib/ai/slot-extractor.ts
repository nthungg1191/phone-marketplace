import { AIIntent } from '@prisma/client'

export interface ConversationState {
  intent?: AIIntent
  budget?: number
  brand?: string
  usage?: string
  camera?: string
  battery?: string
  color?: string
  designPreference?: string
  giftFor?: string
  performanceNeed?: string
  batteryNeed?: string
  cameraNeed?: string
  ambiguousPreference?: string
  suggestedColors?: string[]
  stage?: 'collecting' | 'ready' | 'done'
  lastAction?: 'search' | 'compare' | 'order_support' | 'payment_support' | 'return_support' | 'clarify' | 'answer'
  lastQuestionType?: 'brand' | 'budget' | 'usage' | 'order_code' | 'product_choice' | 'open_follow_up'
  selectedProductRef?: string
  supportTopic?: 'order' | 'payment' | 'return' | 'product'
  lastRecommendations?: RecommendationSnapshot[]
  [key: string]: string | number | string[] | RecommendationSnapshot[] | undefined
}

export interface RecommendationSnapshot {
  productId: number
  title: string
  brand: string
  color: string
  price: number
}

const BRAND_ALIASES: Record<string, string> = {
  iphone: 'Apple',
  apple: 'Apple',
  samsung: 'Samsung',
  galaxy: 'Samsung',
  xiaomi: 'Xiaomi',
  redmi: 'Xiaomi',
  poco: 'Xiaomi',
  oppo: 'OPPO',
  vivo: 'Vivo',
  realme: 'Realme',
  nokia: 'Nokia',
  huawei: 'Huawei',
  'google pixel': 'Google Pixel',
  pixel: 'Google Pixel',
  asus: 'ASUS',
  'one plus': 'OnePlus',
  oneplus: 'OnePlus',
}

const BRAND_KEYWORDS = Object.keys(BRAND_ALIASES).filter(k => k.length > 2)

const USAGE_KEYWORDS: Record<string, string> = {
  game: 'gaming',
  gaming: 'gaming',
  'chơi game': 'gaming',
  chơi: 'gaming',
  'camera chụp ảnh': 'camera',
  'chụp ảnh': 'camera',
  selfie: 'camera',
  chụp: 'camera',
  pin: 'battery',
  'pin trâu': 'battery',
  'dùng lâu': 'battery',
  sạc: 'battery',
  social: 'social',
  facebook: 'social',
  zalo: 'social',
  tiktok: 'social',
  'mỏng nhẹ': 'portable',
  mỏng: 'portable',
  nhẹ: 'portable',
  'màn lớn': 'large_screen',
  'màn hình lớn': 'large_screen',
}

const COLOR_KEYWORDS: Record<string, string> = {
  đỏ: 'Red',
  'màu đỏ': 'Red',
  xanh: 'Blue',
  'màu xanh': 'Blue',
  'xanh lá': 'Green',
  'xanh dương': 'Blue',
  đen: 'Black',
  'màu đen': 'Black',
  trắng: 'White',
  'màu trắng': 'White',
  vàng: 'Gold',
  'màu vàng': 'Gold',
  hồng: 'Pink',
  'màu hồng': 'Pink',
  tím: 'Purple',
  'màu tím': 'Purple',
  bạc: 'Silver',
  'màu bạc': 'Silver',
  gold: 'Gold',
  titanium: 'Titanium',
  graphite: 'Graphite',
  'trắng kem': 'Cream',
  midnight: 'Midnight',
}

const DESIGN_PREFERENCE: Record<string, string> = {
  sang: 'premium',
  xịn: 'premium',
  đẹp: 'premium',
  'sang xịn': 'premium',
  'nhìn giàu': 'luxury',
  'trông giàu': 'luxury',
  'nhìn sang': 'luxury',
  'trông sang': 'luxury',
  'sang trọng': 'luxury',
  'cao cấp': 'premium',
  'mỏng nhẹ': 'slim',
  'mỏng': 'slim',
  'nhẹ': 'lightweight',
  'vuông': 'boxy',
  'bo tròn': 'rounded',
}

const GIFT_TARGET: Record<string, string> = {
  'bạn gái': 'girlfriend',
  'bạn trai': 'boyfriend',
  mẹ: 'mother',
  cha: 'father',
  bố: 'father',
  anh: 'brother',
  chị: 'sister',
  em: 'younger sibling',
  'ông bà': 'grandparents',
  'người yêu': 'partner',
  vợ: 'wife',
  chồng: 'husband',
  sếp: 'boss',
  'đồng nghiệp': 'colleague',
}

const FENG_SHUI_MAP: Record<string, { element: string; colors: string[] }> = {
  'mệnh kim': { element: 'Kim', colors: ['White', 'Gold', 'Silver', 'Grey'] },
  'mệnh mộc': { element: 'Mộc', colors: ['Green', 'Blue'] },
  'mệnh thủy': { element: 'Thủy', colors: ['Black', 'Blue', 'White'] },
  'mệnh hỏa': { element: 'Hỏa', colors: ['Red', 'Pink', 'Orange', 'Purple'] },
  'mệnh thổ': { element: 'Thổ', colors: ['Yellow', 'Brown', 'Beige'] },
  'mệnh Kim': { element: 'Kim', colors: ['White', 'Gold', 'Silver', 'Grey'] },
  'mệnh Mộc': { element: 'Mộc', colors: ['Green', 'Blue'] },
  'mệnh Thủy': { element: 'Thủy', colors: ['Black', 'Blue', 'White'] },
  'mệnh Hỏa': { element: 'Hỏa', colors: ['Red', 'Pink', 'Orange', 'Purple'] },
  'mệnh Thổ': { element: 'Thổ', colors: ['Yellow', 'Brown', 'Beige'] },
}

export class SlotExtractor {
  static extract(message: string): Partial<ConversationState> {
    const msg = message.toLowerCase()
    const slots: Partial<ConversationState> = {}

    const budget = this.extractBudget(msg)
    if (budget !== undefined) slots.budget = budget

    const brand = this.extractBrand(msg)
    if (brand) slots.brand = brand

    const usage = this.extractUsage(msg)
    if (usage) slots.usage = usage

    const camera = this.extractCamera(msg)
    if (camera) slots.camera = camera

    const battery = this.extractBattery(msg)
    if (battery) slots.battery = battery

    const color = this.extractColor(msg)
    if (color) slots.color = color

    const design = this.extractDesignPreference(msg)
    if (design) slots.designPreference = design

    const gift = this.extractGiftTarget(msg)
    if (gift) slots.giftFor = gift

    const fengShui = this.extractFengShui(msg)
    if (fengShui) {
      slots.ambiguousPreference = 'feng_shui'
      slots.suggestedColors = fengShui.colors
    }

    return slots
  }

  static extractBudget(message: string): number | undefined {
    const triệu = message.match(/(\d+(?:[.,]\d+)?)\s*triệu/i)
    if (triệu) return Math.round(parseFloat(triệu[1].replace(',', '.')) * 1_000_000)

    const dưới = message.match(/dưới\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|đồng|trieu)?/i)
    if (dưới) return Math.round(parseFloat(dưới[1].replace(',', '.')) * 1_000_000)

    const trên = message.match(/trên\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|đồng|trieu)?/i)
    if (trên) return Math.round(parseFloat(trên[1].replace(',', '.')) * 1_000_000)

    const khoảng = message.match(/khoảng\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|đồng|trieu)?/i)
    if (khoảng) return Math.round(parseFloat(khoảng[1].replace(',', '.')) * 1_000_000)

    const đ = message.match(/(\d+(?:\.\d+)?)\s*đ\b/i)
    if (đ) {
      const val = parseFloat(đ[1].replace(/\./g, ''))
      if (val >= 100_000) return val
    }

    return undefined
  }

  static extractBrand(message: string): string | undefined {
    for (const keyword of BRAND_KEYWORDS) {
      if (message.includes(keyword)) {
        return BRAND_ALIASES[keyword] || keyword
      }
    }
    return undefined
  }

  static extractUsage(message: string): string | undefined {
    for (const [keyword, value] of Object.entries(USAGE_KEYWORDS)) {
      if (message.includes(keyword)) return value
    }
    return undefined
  }

  static extractCamera(message: string): string | undefined {
    const megapixel = message.match(/(\d+)\s*mp/i)
    if (megapixel) return `${megapixel[1]}MP`
    if (/chụp\s*ảnh|camera\s*tốt|chụp\s*đẹp|selfie/i.test(message)) return 'tốt'
    if (/quay\s*phim|video\s*tốt/i.test(message)) return 'video_tốt'
    return undefined
  }

  static extractBattery(message: string): string | undefined {
    const mah = message.match(/(\d+)\s*mah/i)
    if (mah) return `${mah[1]}mAh`
    if (/pin\s*trâu|pin\s*lâu|dùng\s*lâu|thời\s*lượng\s*pin/i.test(message)) return 'trâu'
    if (/sạc\s*nhanh|fast\s*charge|quick\s*charge/i.test(message)) return 'nhanh'
    return undefined
  }

  static extractColor(message: string): string | undefined {
    for (const [keyword, value] of Object.entries(COLOR_KEYWORDS)) {
      if (message.includes(keyword)) return value
    }
    return undefined
  }

  static extractDesignPreference(message: string): string | undefined {
    for (const [keyword, value] of Object.entries(DESIGN_PREFERENCE)) {
      if (message.includes(keyword)) return value
    }
    return undefined
  }

  static extractGiftTarget(message: string): string | undefined {
    for (const [keyword, value] of Object.entries(GIFT_TARGET)) {
      if (message.includes(keyword)) return value
    }
    return undefined
  }

  static extractFengShui(message: string): { element: string; colors: string[] } | undefined {
    for (const [keyword, value] of Object.entries(FENG_SHUI_MAP)) {
      if (message.includes(keyword)) return value
    }
    return undefined
  }

  static mergeState(
    currentState: Partial<ConversationState> | null,
    newSlots: Partial<ConversationState>,
    newIntent?: AIIntent
  ): Partial<ConversationState> {
    const merged: Partial<ConversationState> = { ...currentState }

    if (currentState?.lastRecommendations) {
      merged.lastRecommendations = [...currentState.lastRecommendations]
    }

    if (newIntent && newIntent !== AIIntent.OUT_OF_SCOPE) {
      merged.intent = newIntent
      merged.stage = 'collecting'
    }

    for (const [key, value] of Object.entries(newSlots)) {
      if (value !== undefined) merged[key] = value
    }

    return merged
  }

  static isComplete(state: Partial<ConversationState>): boolean {
    if (!state.intent || state.intent !== AIIntent.PRODUCT_SEARCH) {
      return state.intent !== undefined
    }
    return state.budget !== undefined && state.budget > 0
  }
}
