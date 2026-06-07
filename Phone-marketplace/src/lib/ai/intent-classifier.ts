import { AIIntent } from '@prisma/client'
import type { ConversationState } from './slot-extractor'

export interface IntentSignal {
  primaryIntent: AIIntent
  secondaryIntents: AIIntent[]
  scores: Record<string, number>
  onTopicSignals: string[]
  offTopicSignals: string[]
  ambiguityLevel: 'low' | 'medium' | 'high'
}

const AMBIGUITY_KEYWORDS = [
  'phong thủy', 'mệnh', 'tính cách', 'gu thẩm mỹ', 'sở thích',
  'màu yêu thích', 'quà tặng', 'hợp vía', 'hợp mệnh',
  'nhìn sang', 'trông sang', 'nhìn giàu', 'cảm giác',
  'thích', 'ưa', 'prefer', 'muốn', 'có vẻ', 'chắc',
]

const AMBIGUITY_PATTERNS: RegExp[] = [
  /(phong thủy|mệnh\s*\w+|hợp\s*mệnh|hợp\s*vía)/i,
  /(tặng\s*(bạn|mẹ|cha|người|yêu))/i,
  /(nhìn|trông).{0,10}(sang|xịn|đẹp|đắt|giàu)/i,
  /(gu\s*thẩm|thẩm\s*mỹ|sở thích)/i,
  /(màu|xu hướng|preference|prefer)/i,
  /(mệnh\s*(kim|mộc|thủy|hỏa|thổ))/i,
]

const INTENT_PATTERNS = [
  {
    intent: AIIntent.PRODUCT_SEARCH,
    patterns: [
      /(tìm|kiếm|mua|tìm kiếm|show|liệt kê|danh sách).{0,20}(dưới|trên|máy|điện thoại|iphone|samsung|xiaomi|poco|redmi|oppo|vivo)/i,
      /(dưới|trên|hơn)\s*\d+\s*(triệu|đồng|trăm)/i,
      /(tìm|mua|kiếm).{0,15}(dưới|trên|hơn)/i,
      /(máy|điện thoại).{0,20}(dưới|trên|tốt|rẻ)/i,
    ],
    keywords: ['tìm điện thoại', 'tìm máy', 'mua điện thoại', 'máy nào', 'có máy nào', 'dưới triệu', 'trên triệu', 'show máy', 'liệt kê'],
  },
  {
    intent: AIIntent.PRODUCT_COMPARISON,
    patterns: [
      /(so sánh|so với|nên|hay|better|vs|nào tốt hơn)/i,
      /(iphone|galaxy|samsung|xiaomi|poco|redmi).{0,10}(hay|với|vs|so với|hoặc)/i,
      /(nên chọn|chọn cái nào|pick one)/i,
    ],
    keywords: ['so sánh', ' vs ', 'hay là', 'nên chọn', 'which is better', 'pick one'],
  },
  {
    intent: AIIntent.PRODUCT_QUESTION,
    patterns: [
      /(có|ko|không).{0,15}(chống nước|camera|pin|màn hình|chip|cpu|ram|5g|wifi)/i,
      /(pin|màn hình|camera|chip|cpu|ram|chống nước|5g).{0,15}(gì|nào|không|bao nhiêu)/i,
      /(máy này|thiết bị này|sp này).{0,20}(có|có phải|thông số|cấu hình)/i,
      /(thông số|cấu hình|specs|đặc điểm|review|đánh giá)/i,
      /(chơi được|chạy được|cài được|chơi game)/i,
      /(chống nước|water resistant|ip68)/i,
    ],
    keywords: ['pin bao nhiêu', 'màn hình gì', 'camera nào', 'chip gì', 'chống nước không', 'chơi game được không'],
  },
  {
    intent: AIIntent.ORDER_SUPPORT,
    patterns: [
      /(đơn hàng|order|mã đơ|ship|vận chuyển|giao hàng|nhận hàng).{0,30}(ở đâu|đâu|chưa|nào|số mấy|code|của tôi)/i,
      /(đơn của tôi|đơn tôi|đơn hàng của tôi)/i,
      /(khi nào|bao giờ|nào).{0,15}(giao|nhận|về)/i,
      /(xem|kiểm tra|tra).{0,10}(đơn|order)/i,
      /(đã|xác nhận|duyệt).{0,15}(đơn|chưa)/i,
    ],
    keywords: ['đơn hàng của tôi', 'đơn ở đâu', 'giao khi nào', 'ship chưa', 'mã đơ', 'order code', 'kiểm tra đơn'],
  },
  {
    intent: AIIntent.PAYMENT_SUPPORT,
    patterns: [
      /(thanh toán|payment|sepay|cod|ví|chuyển khoản|banking|napas)/i,
      /(quét|mã qr|qr code|scan).{0,10}(thanh toán|payment)/i,
      /(cách thanh toán|làm sao thanh toán|hướng dẫn thanh toán)/i,
      /(đã thanh toán|thanh toán chưa|thanh toán thế nào)/i,
    ],
    keywords: ['thanh toán', 'sepay', 'cod', 'chuyển khoản', 'quét qr', 'payment'],
  },
  {
    intent: AIIntent.RETURN_REFUND,
    patterns: [
      /(trả hàng|đổi trả|hoàn tiền|refund|return|exchange)/i,
      /(làm sao|muốn|muốn trả).{0,15}(hàng|trả|đổi)/i,
      /(hàng lỗi|sai|hỏng|không đúng).{0,15}(làm sao|trả)/i,
      /(điều kiện|cần|gì).{0,15}(đổi|trả|hoàn)/i,
      /(hoàn tiền|trả hàng).{0,15}(bao lâu|mất)/i,
    ],
    keywords: ['đổi trả', 'trả hàng', 'hoàn tiền', 'refund', 'return', 'làm sao trả hàng'],
  },
  {
    intent: AIIntent.POLICY_FAQ,
    patterns: [
      /(chính sách|policy|quy định|luật|rule)/i,
      /(thu phí|phí|chi phí|fee|charge|cost).{0,20}(thế nào|nào|bao nhiêu)/i,
      /(bảo hành|warranty|guarantee)/i,
      /(người bán|xác minh|verified|trust|tin cậy)/i,
      /(an toàn|bảo mật|scam|lừa đảo)/i,
      /(marketplace|nền tảng).{0,20}(thế nào|nào|như)/i,
    ],
    keywords: ['chính sách', 'thu phí', 'bảo hành', 'người bán', 'an toàn', 'marketplace'],
  },
  {
    intent: AIIntent.SHOPPING_PREFERENCE,
    patterns: [
      /(phong thủy|mệnh\s*\w+|hợp\s*mệnh|hợp\s*vía)/i,
      /(màu\s*\w{3,}|màu\s*(đỏ|xanh|đen|trắng|vàng|hồng|tím|bạc|gold|titan))/i,
      /(tặng\s*(bạn gái|bạn trai|mẹ|cha|anh|chị|em|ông|bà|người|yêu|vợ|chồng))/i,
      /(quà\s*tặng|món\s*quà|mua\s*tặng)/i,
      /(gu\s*(thẩm mỹ|thẩm mỹ)|thẩm mỹ|sở thích)/i,
      /(nhìn|trông).{0,10}(đẹp|sang|xịn|đắt|giàu)/i,
      /(ưa|thích|thích\s*màu|prefer)/i,
      /(mệnh\s*(kim|mộc|thủy|hỏa|thổ))/i,
    ],
    keywords: ['phong thủy', 'tính cách', 'gu thẩm mỹ', 'sở thích', 'màu yêu thích', 'quà tặng', 'tặng bạn gái', 'tặng mẹ', 'mệnh', 'hợp vía', 'hợp mệnh', 'màu đỏ', 'màu xanh', 'màu đen', 'nhìn sang', 'trông sang'],
  },
]

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /(thời tiết|weather)/i,
  /(tin tức|hôm nay|tin mới)/i,
  /(chính trị|chính phủ|quốc hội)/i,
  /(thể thao|bóng đá|world cup|sea games)/i,
  /(viết code|lập trình|javascript|python|java |golang|code python|code react)/i,
  /(giá vàng|forex|crypto|bitcoin|chứng khoán)/i,
  /(viết bài|content|blog|seo)/i,
  /(dịch thuật|translate|tiếng anh)/i,
  /(meme|joke|hài|hước)/i,
  /(đặt vé|máy bay|khách sạn|du lịch|travel)/i,
  /(nấu ăn|món ăn|recipe|food)/i,
  /(chăm sóc sức khỏe|bệnh|medical|thuốc)/i,
  /(viết app|viết web|viết phần mềm)/i,
]

export class IntentClassifier {
  static analyze(
    message: string,
    currentState?: Partial<ConversationState> | null
  ): IntentSignal {
    const normalizedMessage = message.trim().toLowerCase()

    // Check OUT_OF_SCOPE patterns first — they take priority
    for (const pattern of OUT_OF_SCOPE_PATTERNS) {
      if (pattern.test(normalizedMessage)) {
        return {
          primaryIntent: AIIntent.OUT_OF_SCOPE,
          secondaryIntents: [],
          scores: { OUT_OF_SCOPE: 99 },
          onTopicSignals: [],
          offTopicSignals: [pattern.source],
          ambiguityLevel: 'low',
        }
      }
    }

    const scores: Record<string, number> = {}

    for (const pattern of INTENT_PATTERNS) {
      scores[pattern.intent] = 0

      for (const regex of pattern.patterns) {
        if (regex.test(normalizedMessage)) {
          scores[pattern.intent] += 3
        }
      }

      for (const keyword of pattern.keywords) {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          scores[pattern.intent] += 1
        }
      }
    }

    const onTopicSignals: string[] = []

    for (const [intent, score] of Object.entries(scores)) {
      if (score > 0) {
        const matched = INTENT_PATTERNS.find(p => p.intent === intent)
        if (matched) {
          for (const kw of matched.keywords) {
            if (normalizedMessage.includes(kw.toLowerCase())) {
              onTopicSignals.push(kw)
            }
          }
        }
      }
    }

    const ambiguityScore = AMBIGUITY_PATTERNS.reduce((acc, p) => {
      return acc + (p.test(normalizedMessage) ? 2 : 0)
    }, 0) + AMBIGUITY_KEYWORDS.filter(kw => normalizedMessage.includes(kw)).length

    let ambiguityLevel: 'low' | 'medium' | 'high' = 'low'
    if (ambiguityScore >= 3) ambiguityLevel = 'high'
    else if (ambiguityScore >= 1) ambiguityLevel = 'medium'

    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, s]) => s > 0)

    const primary = sorted.length > 0 ? sorted[0][0] as AIIntent : AIIntent.OUT_OF_SCOPE
    const secondary = sorted.slice(1, 4).map(([s]) => s as AIIntent)

    return {
      primaryIntent: primary,
      secondaryIntents: secondary,
      scores,
      onTopicSignals,
      offTopicSignals: [],
      ambiguityLevel,
    }
  }

  static getIntentLabel(intent: AIIntent): string {
    const labels: Record<AIIntent, string> = {
      [AIIntent.PRODUCT_SEARCH]: 'Tìm sản phẩm',
      [AIIntent.PRODUCT_COMPARISON]: 'So sánh sản phẩm',
      [AIIntent.PRODUCT_QUESTION]: 'Hỏi về sản phẩm',
      [AIIntent.ORDER_SUPPORT]: 'Hỗ trợ đơn hàng',
      [AIIntent.PAYMENT_SUPPORT]: 'Hỗ trợ thanh toán',
      [AIIntent.RETURN_REFUND]: 'Đổi trả & Hoàn tiền',
      [AIIntent.POLICY_FAQ]: 'Chính sách & FAQ',
      [AIIntent.SHOPPING_PREFERENCE]: 'Sở thích mua sắm',
      [AIIntent.OUT_OF_SCOPE]: 'Ngoài phạm vi',
    }
    return labels[intent]
  }
}
