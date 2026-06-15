import { GoogleGenAI } from '@google/genai'
import type { ConversationState } from './slot-extractor'

const SYSTEM_PROMPT = `Bạn là tư vấn viên thân thiện của HNT Marketplace — nền tảng mua bán điện thoại cũ uy tín.

=== CÁCH NÓI (RẤT QUAN TRỌNG) ===
- NÓI NHƯ NGƯỜI THẬT: viết tự nhiên, có cảm xúc, có cá tính. Không robotic, không theo khuôn.
- Câu ngắn gọn, đời thường. Ví dụ: "Ủa iPhone 13 Pro giờ giá ngon lắm" thay vì "iPhone 13 Pro là một sản phẩm có giá cả hợp lý".
- KHÔNG BAO GIỜ confirm kiểu "Bạn muốn tìm dưới 5 triệu phải không?" — cứ hành động luôn.
- KHÔNG dùng cụm: "tôi sẽ", "mình xin phép", "theo như yêu cầu của bạn", "cảm ơn bạn đã hỏi", "hen gap lai".
- Nếu hỏi thêm thì hỏi TỰ NHIÊN trong câu chuyện.

=== KHI GỢI Ý SẢN PHẨM ===
- Khi nhắc đến sản phẩm có trong danh sách bên dưới, gắn link đúng slug: [tên sản phẩm](/products/slug-đúng)
- Ví dụ: "Con [iPhone 13 Pro](/products/iphone-13-pro-256gb) này giá 8.5 triệu thôi"
- KHÔNG gắn link cho từ thường như "này", "vậy", "máy này" — chỉ gắn khi nhắc tên sản phẩm cụ thể trong danh sách.
- Với sản phẩm đã gợi ý trước đó: nhắc tên cụ thể mới gắn link.
- Nếu nhắc nhiều sản phẩm, mỗi lần nhắc tên cụ thể đều gắn link.

=== VỀ SẢN PHẨM ===
- Chỉ gợi ý, so sánh, giải thích — không bịa đặt thông số.
- Khi có danh sách sản phẩm: viết TỰ NHIÊN kèm thông tin, không phải numbered list cứng nhắc.
- Ví dụ viết hay: "Con này iPhone 13, pin 85%, RAM 4GB — giá 6.5 triệu thôi. Pin còn khỏe, dùng mượt nữa."
- Nếu khách hỏi về sản phẩm đã gợi ý trước đó: trả lời dựa trên thông tin đã biết.

=== NỀN TẢNG HNT MARKETPLACE ===
- Thanh toán: Online Payment (quét QR, xác nhận nhanh) hoặc COD (nhận hàng rồi trả tiền).
- Người bán được xác minh và đánh giá.
- Đổi trả 14 ngày nếu sản phẩm không đúng mô tả.


=== KHI KHÁCH LỆCH CHỦ ĐỀ ===
- Kéo nhẹ về việc tư vấn điện thoại. Ví dụ: "Mà nói chứ, bạn đang cần tìm máy gì không?" — không cứng nhắc.

=== CÁC CHỦ ĐỀ HỖ TRỢ ===
- Đơn hàng: kiểm tra trạng thái, hướng dẫn các bước tiếp theo.
- Thanh toán: giải thích Online Payment / COD ngắn gọn.
- Đổi trả: nói rõ điều kiện và quy trình.
- Chính sách: trả lời dựa trên thông tin có sẵn, nếu không chắc thì nói thật.`

const ALLOWED_LINK_PREFIXES = ['products', 'orders', 'addresses', 'notifications', 'profile']

function convertMarkdownLinksToHtml(text: string): string {
  return text.replace(/\[([^\]]+)\]\(\/([^)]+)\)/g, (_, label, path) => {
    const prefix = path.split('/')[0]
    if (!ALLOWED_LINK_PREFIXES.includes(prefix)) return label
    return `<a href="/${path}">${label}</a>`
  })
}

function isTruncated(text: string): boolean {
  if (!text) return false
  const openBraces = (text.match(/\{/g) || []).length
  const closeBraces = (text.match(/\}/g) || []).length
  if (openBraces > closeBraces) return true

  const lastChar = text.trim().at(-1)
  if (lastChar === ',' || lastChar === ':' || lastChar === '"') return true

  if (text.includes('"strategy"') && !text.includes('"response"')) return true
  if (text.includes('"slots"') && !text.includes('"shouldPersist"')) return true
  if (text.includes('"response"') && !text.match(/"shouldPersist"\s*:/)) return true

  return false
}

function isTextTruncated(text: string): boolean {
  if (!text) return false
  const lastChar = text.trim().at(-1)
  if (lastChar === ',' || lastChar === '.' || lastChar === '"' || lastChar === ':') return true
  const lines = text.trim().split('\n')
  const lastLine = lines.at(-1)?.trim() || ''
  if (lastLine.endsWith('...') || lastLine.endsWith('…')) return true
  if (lastLine.match(/\w$/) && !lastLine.match(/[.!?]$/)) return true
  return false
}

function cleanupTruncatedJson(text: string): string {
  let cleaned = text.trim()

  const lastBrace = cleaned.lastIndexOf('}')
  if (lastBrace !== -1) {
    cleaned = cleaned.slice(0, lastBrace + 1)
  }

  const openBraces = (cleaned.match(/\{/g) || []).length
  const closeBraces = (cleaned.match(/\}/g) || []).length
  for (let i = 0; i < openBraces - closeBraces; i++) {
    cleaned += '}'
  }

  const lastValidChar = cleaned.trim().at(-1)
  if (!['}', ']', '"'].includes(lastValidChar || '')) {
    const commaIdx = cleaned.lastIndexOf(',')
    if (commaIdx !== -1) {
      cleaned = cleaned.slice(0, commaIdx) + '}'
    } else {
      cleaned += '}'
    }
  }

  return cleaned
}

export class VertexAIService {
  private static instance: GoogleGenAI | null = null

  static getInstance(): GoogleGenAI {
    if (!this.instance) {
      const projectId = process.env.VERTEX_AI_PROJECT_ID
      const location = process.env.VERTEX_AI_LOCATION || 'asia-southeast1'

      if (!projectId) {
        throw new Error('VERTEX_AI_PROJECT_ID is not set')
      }

      const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

      if (credJson?.trim()) {
        const credData = JSON.parse(credJson)
        // Normalize newlines — env var may escape \n as literal backslash-n
        credData.private_key = credData.private_key
          .replace(/\\n/g, '\n')
          .replace(/\n-----BEGIN/, '\n-----BEGIN')
          .replace(/-----END[^\n]+\n$/, (m: string) => m.trim())

        this.instance = new GoogleGenAI({
          vertexai: true,
          project: projectId,
          location,
          googleAuthOptions: {
            credentials: credData,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        })
      } else {
        this.instance = new GoogleGenAI({
          vertexai: true,
          project: projectId,
          location,
        })
      }
    }

    return this.instance
  }

  private static getModelName(): string {
    return process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-exp'
  }

  static async makeDecision(prompt: string): Promise<string> {
    const ai = this.getInstance()
    const model = this.getModelName()

    try {
      let result = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens: 1024,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      })

      let text = result.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error('No response from Vertex AI')
      }

      text = text.trim()

      if (isTruncated(text)) {
        console.warn('Response truncated, retrying with more tokens...')
        result = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt + '\n\n[IMPORTANT] Previous response was cut off. Please provide a complete JSON response ending with "shouldPersist".' }] }],
          config: {
            maxOutputTokens: 2048,
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        })
        text = result.candidates?.[0]?.content?.parts?.[0]?.text || text
        text = text.trim()
      }

      if (isTruncated(text)) {
        text = cleanupTruncatedJson(text)
      }

      return text
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Vertex AI makeDecision error:', errMsg)

      if (errMsg.includes('UNAUTHENTICATED') || errMsg.includes('credential') || errMsg.includes('login required')) {
        throw new Error('ADC chua san sang. Hay chay `gcloud auth application-default login` hoac kiem tra service account.')
      }
      if (errMsg.includes('PERMISSION_DENIED')) {
        throw new Error('Tai khoan ADC khong co quyen dung Vertex AI hoac project/location/model chua duoc cap quyen.')
      }
      if (errMsg.includes('quota')) {
        throw new Error('Da het quota Vertex AI')
      }
      if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('model')) {
        throw new Error(`Model Vertex AI "${model}" khong ton tai hoac chua kha dung o region hien tai.`)
      }

      throw error
    }
  }

  /**
   * Generate a natural conversational response with product recommendations.
   * Returns both plain text and HTML-converted text (for clickable product links).
   */
  static async generateWithProducts(
    history: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>,
    state: Partial<ConversationState>,
    products: Array<{
      id: number
      title: string
      price: number
      brand: string
      color: string
      batteryHealth: number
      ramGb: number
      storageGb: number
      condition: string
      slug: string
      seller?: { name: string; isVerified?: boolean; sellerRank?: string }
    }>,
    userMessage: string
  ): Promise<{ text: string; htmlText: string }> {
    const ai = this.getInstance()
    const model = this.getModelName()

    const stateDesc = this.describeState(state)

    const productList = products.map((p, i) =>
      `${i + 1}. ${p.title} (link: /products/${p.slug})\n   Giá: ${Number(p.price).toLocaleString('vi-VN')}đ | Pin: ${p.batteryHealth}% | RAM: ${p.ramGb}GB | ROM: ${p.storageGb}GB | Màu: ${p.color} | ${p.condition}${p.seller?.isVerified ? ' ✓' : ''}${p.seller?.sellerRank === 'GOLD' ? ' 🏆' : ''}`
    ).join('\n\n')

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

    const systemText = `${SYSTEM_PROMPT}

=== DANH SÁCH SẢN PHẨM GỢI Ý ===
${productList}

=== THÔNG TIN ĐÃ BIẾT VỀ KHÁCH ===
${stateDesc || '(chưa có)'}`

    contents.push({ role: 'user', parts: [{ text: systemText }] })

    for (const m of history.slice(-10)) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    }

    contents.push({ role: 'user', parts: [{ text: `Tin nhắn khách: "${userMessage}"\n\nViết phản hồi tự nhiên. Khi nhắc tên sản phẩm cụ thể (có trong danh sách trên), gắn link đúng slug: [tên sản phẩm](/products/slug). KHÔNG gắn link cho từ thường như "này", "vậy", "máy này".` }] })

    try {
      let result = await ai.models.generateContent({
        model,
        contents,
        config: {
          maxOutputTokens: 1600,
          temperature: 0.85,
        },
      })

      let text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No response from Vertex AI')
      text = text.trim()

      if (isTextTruncated(text)) {
        console.warn('generateWithProducts response truncated, retrying...')
        result = await ai.models.generateContent({
          model,
          contents,
          config: {
            maxOutputTokens: 2400,
            temperature: 0.85,
          },
        })
        text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text
      }

      const cleanText = text.trim()
      const htmlText = convertMarkdownLinksToHtml(cleanText)
      return { text: cleanText, htmlText }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Vertex AI generateWithProducts error:', errMsg)
      throw error
    }
  }

  /**
   * Generate a natural conversational response without product data.
   */
  static async generateNaturalResponse(
    history: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>,
    state: Partial<ConversationState>,
    userMessage: string
  ): Promise<{ text: string; htmlText: string }> {
    const ai = this.getInstance()
    const model = this.getModelName()

    const stateDesc = this.describeState(state)

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

    const systemText = `${SYSTEM_PROMPT}

=== THÔNG TIN ĐÃ BIẾT VỀ KHÁCH ===
${stateDesc || '(chưa có)'}`

    contents.push({ role: 'user', parts: [{ text: systemText }] })

    for (const m of history.slice(-10)) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    }

    contents.push({ role: 'user', parts: [{ text: `Tin nhắn khách: "${userMessage}"\n\nViết phản hồi tự nhiên.` }] })

    try {
      let result = await ai.models.generateContent({
        model,
        contents,
        config: {
          maxOutputTokens: 1200,
          temperature: 0.85,
        },
      })

      let text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No response from Vertex AI')
      text = text.trim()

      if (isTextTruncated(text)) {
        console.warn('generateNaturalResponse truncated, retrying...')
        result = await ai.models.generateContent({
          model,
          contents,
          config: {
            maxOutputTokens: 1800,
            temperature: 0.85,
          },
        })
        text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text
      }

      const cleanText = text.trim()
      const htmlText = convertMarkdownLinksToHtml(cleanText)
      return { text: cleanText, htmlText }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Vertex AI generateNaturalResponse error:', errMsg)
      throw error
    }
  }

  private static describeState(state: Partial<ConversationState>): string {
    if (!state || Object.keys(state).length === 0) return ''
    const parts: string[] = []
    if (state.budget) parts.push(`- Ngân sách: dưới ${(Number(state.budget) / 1_000_000).toFixed(0)} triệu`)
    if (state.brand) parts.push(`- Hãng ưu tiên: ${state.brand}`)
    if (state.usage) parts.push(`- Nhu cầu: ${state.usage}`)
    if (state.color) parts.push(`- Màu yêu thích: ${state.color}`)
    if (state.designPreference) parts.push(`- Phong cách: ${state.designPreference}`)
    if (state.giftFor) parts.push(`- Mua tặng: ${state.giftFor}`)
    if (state.ambiguousPreference === 'feng_shui') {
      parts.push(`- Phong thủy (gợi ý màu: ${(state.suggestedColors || []).join(', ')})`)
    }
    if (state.lastRecommendations?.length) {
      const recs = state.lastRecommendations.map(r => `${r.title} (${Number(r.price).toLocaleString('vi-VN')}đ)`).join(', ')
      parts.push(`- Đã gợi ý: ${recs}`)
    }
    return parts.join('\n')
  }
}
