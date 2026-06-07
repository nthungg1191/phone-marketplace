const ON_TOPIC_KEYWORDS = [
  'điện thoại', 'điện thoại', 'máy', 'mua', 'tìm', 'kiếm',
  'iphone', 'samsung', 'xiaomi', 'redmi', 'poco', 'oppo', 'vivo',
  'realme', 'nokia', 'huawei', 'pixel', 'oneplus', 'asus', 'galaxy',
  'pin', 'battery', 'camera', 'chụp ảnh', 'selfie',
  'màn hình', 'ram', 'chip', 'snapdragon', 'exynos',
  'màu sắc', 'màu đỏ', 'màu xanh', 'màu đen', 'màu trắng', 'màu vàng', 'màu hồng',
  'đơn hàng', 'ship', 'giao hàng', 'vận chuyển',
  'thanh toán', 'sepay', 'cod', 'chuyển khoản',
  'đổi trả', 'hoàn tiền', 'refund',
  'bảo hành', 'chính sách',
  'người bán', 'seller', 'shop',
  'game', 'gaming', 'chơi game',
  'thương hiệu',
  'phong thủy', 'mệnh', 'sở thích', 'quà tặng',
  'sang', 'xịn', 'đẹp', 'cao cấp', 'premium',
  'cấu hình', 'thông số', 'performance',
  'ngân sách',
  'chống nước', 'wifi', 'bluetooth',
  'smartphone', 'dtdd',
]

const OFF_TOPIC_KEYWORDS = [
  'thời tiết',
  'tin tức', 'news',
  'bóng đá', 'world cup', 'sea games',
  'lập trình', 'javascript', 'python', 'java', 'golang',
  'giá vàng', 'forex', 'crypto', 'bitcoin', 'chứng khoán', 'đầu tư',
  'nấu ăn', 'recipe', 'food',
  'chính trị', 'bầu cử',
  'bệnh', 'medical', 'sức khỏe',
  'du lịch', 'máy bay', 'khách sạn',
  'phim', 'nhạc', 'steam', 'dota', 'lol',
  'meme', 'joke',
  'dịch thuật', 'translate',
  'viết bài', 'seo',
  'react', 'vue', 'angular', 'typescript',
]

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
}

function containsKeyword(text: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    if (kw.length >= 5) {
      if (text.includes(kw)) return true
    } else {
      const words = tokenizeWords(text)
      if (words.includes(kw)) return true
    }
  }
  return false
}

export interface ConversationTurn {
  userMessage: string
  botMessage: string
  strategy?: string
}

export class SemanticChecker {
  static isShoppingRelated(
    message: string,
    history: ConversationTurn[] = []
  ): boolean {
    const msg = message.toLowerCase()

    const hasOffTopic = containsKeyword(msg, OFF_TOPIC_KEYWORDS)
    if (hasOffTopic) return false

    const hasOnTopic = containsKeyword(msg, ON_TOPIC_KEYWORDS)
    if (hasOnTopic) return true

    if (history.length > 0) {
      const lastBot = history[history.length - 1].botMessage.toLowerCase()
      if (containsKeyword(lastBot, ON_TOPIC_KEYWORDS)) {
        const words = tokenizeWords(msg)
        const shortPronouns = ['thế', 'vậy', 'sao', 'thì', 'có', 'không', 'ừ', 'ờ', 'à', 'nhé', 'mà', 'với', 'rồi', 'đó', 'này', 'đi', 'cho', 'với', 'của']
        const isShort = words.length <= 3 || words.every(w => shortPronouns.includes(w))
        if (isShort) return true
      }
    }

    return false
  }

  static isTrulyOffTopic(message: string): boolean {
    const msg = message.toLowerCase()
    const hasOffTopic = containsKeyword(msg, OFF_TOPIC_KEYWORDS)
    const hasOnTopic = containsKeyword(msg, ON_TOPIC_KEYWORDS)
    return hasOffTopic && !hasOnTopic
  }

  static hasSemanticOverlap(wordsA: string[], wordsB: string[]): boolean {
    const textB = wordsB.join(' ')
    for (const a of wordsA) {
      if (textB.includes(a)) return true
    }
    return false
  }

  static levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (a.length === 0 || b.length === 0) return 0
    const matrix: number[][] = []
    for (let i = 0; i <= b.length; i++) matrix[i] = [i]
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }
    return 1 - matrix[b.length][a.length] / Math.max(a.length, b.length)
  }

  static extractContextualReferences(
    message: string,
    history: ConversationTurn[]
  ): string[] {
    const msgWords = tokenizeWords(message)
    const references: string[] = []
    if (history.length === 0) return references

    const lastBot = history[history.length - 1].botMessage
    const pronouns = ['nó', 'cái đó', 'máy đó', 'sản phẩm đó', 'thế', 'vậy', 'sao', 'thì', 'có', 'không', 'ừ', 'ờ', 'à', 'nhé']
    const contentWords = msgWords.filter(w => !pronouns.includes(w))

    for (const word of contentWords) {
      if (lastBot.toLowerCase().includes(word)) {
        references.push(word)
      }
    }
    return references
  }
}
