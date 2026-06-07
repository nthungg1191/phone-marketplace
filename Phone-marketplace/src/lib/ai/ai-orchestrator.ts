import { AIIntent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SlotExtractor, type ConversationState } from './slot-extractor'
import { SemanticChecker, type ConversationTurn } from './semantic-relevance'
import { VertexAIService } from './vertex-ai'

export type Strategy =
  | 'search_products'
  | 'answer_question'
  | 'order_support'
  | 'payment_support'
  | 'return_support'
  | 'policy_faq'
  | 'account_navigation'

export interface OrchestrationDecision {
  strategy: Strategy
  extractedSlots: Partial<ConversationState>
  mergedState: Partial<ConversationState>
  response: string
  shouldPersist: boolean
  searchFilters?: {
    budget?: number
    brand?: string
    usage?: string
    color?: string
    designPreference?: string
    giftFor?: string
    camera?: string
    battery?: string
  }
  intent?: AIIntent
}

export class AIOrchestrator {
  static async decide(
    message: string,
    userId: string,
    conversationId?: string,
    currentState?: Partial<ConversationState> | null
  ): Promise<OrchestrationDecision> {
    const safeCurrentState = currentState || null
    const history: ConversationTurn[] = conversationId
      ? await this.getHistory(conversationId, userId)
      : []

    const isOffTopic = SemanticChecker.isTrulyOffTopic(message)
    const newSlots = SlotExtractor.extract(message)
    const mergedState = SlotExtractor.mergeState(safeCurrentState, newSlots)

    if (isOffTopic && history.length === 0 && !safeCurrentState?.lastRecommendations?.length) {
      return {
        strategy: 'answer_question',
        extractedSlots: newSlots,
        mergedState,
        response: '',
        shouldPersist: false,
        intent: AIIntent.OUT_OF_SCOPE,
      }
    }

    const response = await this.llmDecision(message, history, mergedState)
    return response
  }

  private static async llmDecision(
    message: string,
    history: ConversationTurn[],
    state: Partial<ConversationState>
  ): Promise<OrchestrationDecision> {
    const historyText = history.slice(-8).map((h, i) =>
      `Turn ${i + 1} - Khách: ${h.userMessage}\nTư vấn: ${h.botMessage}`
    ).join('\n\n')

    const stateDesc = this.describeState(state)

    const prompt = `Bạn là tư vấn viên thân thiện của HNT Marketplace — nền tảng mua bán điện thoại cũ.

=== CÁCH NÓI ===
- TRẢ LỜI TỰ NHIÊN NHẤT, như đang chat với bạn bè, KHÔNG phải chatbot.
- KHÔNG confirm lại thông tin kiểu "Bạn muốn tìm dưới X triệu phải không?". Mà cứ tự nhiên hành động luôn.
- KHÔNG dùng cụm "tôi sẽ", "mình xin phép", "theo như yêu cầu của bạn" — nói thẳng luôn.
- Nếu thiếu thông tin cần thiết để tư vấn, hỏi TỰ NHIÊN trong câu chuyện, không phải checklist.
- KHÔNG BAO GIỜ tự tạo thông tin sản phẩm (giá, thông số, màu) — chỉ gợi ý dựa trên dữ liệu được cung cấp.
- KHÔNG trả lời kiểu "Dưới 5 triệu có nhiều lựa chọn. Bạn thích hãng nào?" — mà cứ gợi ý luôn.

=== NỀN TẢNG HNT MARKETPLACE ===
- Mua bán điện thoại cũ, có xác minh người bán.
- Thanh toán: SePay (QR tự động) hoặc COD (nhận hàng rồi trả tiền).
- Miễn phí vận chuyển cho đơn từ 5 triệu.
- Đổi trả 14 ngày nếu sản phẩm không đúng mô tả.
- Phí giao dịch 5% cho người bán.

=== TRẢ LỜI CÁC CHỦ ĐỀ ===

**Khi khách muốn tìm điện thoại:**
- Hỏi thêm ngân sách, hãng, nhu cầu nếu thiếu — nhưng hỏi tự nhiên trong câu.
- Nếu đã có đủ thông tin → hãy để "ACTION: SEARCH_PRODUCTS" (xem bên dưới).
- Nếu khách đã có sản phẩm được gợi ý trước đó → có thể gợi ý thêm, so sánh, giải thích — không cần hỏi lại.

**Khi khách hỏi về đơn hàng:**
- Tra cứu đơn hàng của khách → "ACTION: ORDER_SUPPORT"

**Khi khách hỏi thanh toán:**
- Giải thích SePay / COD tự nhiên → "ACTION: PAYMENT_SUPPORT"

**Khi khách hỏi đổi trả:**
- Nói rõ điều kiện + quy trình → "ACTION: RETURN_SUPPORT"

**Khi khách hỏi chính sách / bảo hành:**
- Trả lời dựa trên thông tin nền tảng → "ACTION: POLICY_FAQ"

**Khi khách hỏi về điều hướng trong app (đổi mật khẩu, hồ sơ, thông tin cá nhân, địa chỉ, ví, thông báo):**
- Trả lời TỰ NHIÊN kèm link đến trang phù hợp.
- Các route có sẵn:
  - Đổi mật khẩu: /profile/password
  - Xem/sửa hồ sơ: /profile
  - Quản lý địa chỉ: /addresses
  - Đơn hàng của tôi: /orders
  - Thông báo: /notifications
  - Ví / SePay: /profile
- Ví dụ: "Bạn vào /profile/password để đổi mật khẩu nhé." hoặc viết tự nhiên hơn.
- Nếu câu hỏi không thuộc các route trên, trả lời chung: "Bạn vào /profile để xem các cài đặt nhé."
- → "ACTION: ACCOUNT_NAVIGATION"

**Khi khách lệch chủ đề:**
- Kéo nhẹ về việc tư vấn điện thoại, KHÔNG từ chối cứng.

=== FORMAT TRẢ LỜI ===
Trả lời bằng JSON hợp lệ DUY NHẤT. Không markdown, không code block, không text ngoài JSON.

{
  "strategy": "search_products | answer_question | order_support | payment_support | return_support | policy_faq | account_navigation",
  "response": "phản hồi tự nhiên bằng tiếng Việt, viết như người thật",
  "slots": { "budget": number|null, "brand": string|null, "usage": string|null, "color": string|null, "designPreference": string|null, "giftFor": string|null, "camera": string|null, "battery": string|null },
  "shouldPersist": true | false,
  "actionHint": "SEARCH_PRODUCTS | ORDER_SUPPORT | PAYMENT_SUPPORT | RETURN_SUPPORT | POLICY_FAQ | null"
}

=== NGU CẢNH ===
Thông tin đã biết về khách: ${stateDesc || '(chưa có thông tin gì)'}

Lịch sử hội thoại:
${historyText || '(cuộc trò chuyện mới)'}

Tin nhắn khách: "${message}"

Trả lời JSON:`

    try {
      const result = await VertexAIService.makeDecision(prompt)
      const parsed = this.parseDecisionResponse(result)

      const finalState = SlotExtractor.mergeState(state, parsed.slots || {})
      finalState.lastAction = this.strategyToAction(parsed.strategy)
      finalState.supportTopic = this.strategyToTopic(parsed.strategy)

      return {
        strategy: parsed.strategy,
        extractedSlots: parsed.slots || {},
        mergedState: finalState,
        response: parsed.response || '',
        shouldPersist: parsed.shouldPersist !== false,
        searchFilters: parsed.strategy === 'search_products' ? {
          budget: finalState.budget,
          brand: finalState.brand,
          usage: finalState.usage,
          color: finalState.color,
          designPreference: finalState.designPreference,
          giftFor: finalState.giftFor,
          camera: finalState.camera,
          battery: finalState.battery,
        } : undefined,
        intent: this.strategyToIntent(parsed.strategy),
      }
    } catch (e) {
      console.error('LLM decision failed:', e)
      return this.recoverFromFailure(message, state)
    }
  }

  private static strategyToAction(strategy: Strategy): ConversationState['lastAction'] {
    const map: Record<Strategy, ConversationState['lastAction']> = {
      search_products: 'search',
      answer_question: 'answer',
      order_support: 'order_support',
      payment_support: 'payment_support',
      return_support: 'return_support',
      policy_faq: 'answer',
      account_navigation: 'answer',
    }
    return map[strategy] || 'answer'
  }

  private static strategyToTopic(strategy: Strategy): ConversationState['supportTopic'] {
    const map: Record<Strategy, ConversationState['supportTopic']> = {
      search_products: 'product',
      answer_question: 'product',
      order_support: 'order',
      payment_support: 'payment',
      return_support: 'return',
      policy_faq: 'product',
      account_navigation: 'product',
    }
    return map[strategy] || 'product'
  }

  private static strategyToIntent(strategy: Strategy): AIIntent {
    const map: Record<Strategy, AIIntent> = {
      search_products: AIIntent.PRODUCT_SEARCH,
      answer_question: AIIntent.PRODUCT_QUESTION,
      order_support: AIIntent.ORDER_SUPPORT,
      payment_support: AIIntent.PAYMENT_SUPPORT,
      return_support: AIIntent.RETURN_REFUND,
      policy_faq: AIIntent.POLICY_FAQ,
      account_navigation: AIIntent.POLICY_FAQ,
    }
    return map[strategy] || AIIntent.PRODUCT_SEARCH
  }

  private static parseDecisionResponse(text: string): {
    strategy: Strategy
    response: string
    slots: Partial<ConversationState>
    shouldPersist: boolean
    actionHint: string
  } {
    const cleaned = this.stripMarkdown(text)

    try {
      const parsed = JSON.parse(cleaned)
      return {
        strategy: parsed.strategy || 'answer_question',
        response: parsed.response || '',
        slots: parsed.slots || {},
        shouldPersist: parsed.shouldPersist !== false,
        actionHint: parsed.actionHint || null,
      }
    } catch {
      const extracted = this.extractFirstJsonObject(cleaned)
      if (extracted) {
        const parsed = JSON.parse(extracted)
        return {
          strategy: parsed.strategy || 'answer_question',
          response: parsed.response || '',
          slots: parsed.slots || {},
          shouldPersist: parsed.shouldPersist !== false,
          actionHint: parsed.actionHint || null,
        }
      }
      throw new Error(`Unable to parse LLM response: ${cleaned.slice(0, 200)}`)
    }
  }

  private static extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf('{')
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < text.length; i++) {
      const char = text[i]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }

      if (char === '"') {
        inString = true
        continue
      }

      if (char === '{') depth++
      if (char === '}') {
        depth--
        if (depth === 0) {
          return text.slice(start, i + 1)
        }
      }
    }

    return null
  }

  private static stripMarkdown(text: string): string {
    return text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }

  private static describeState(state: Partial<ConversationState>): string {
    if (!state || Object.keys(state).length === 0) return ''
    const parts: string[] = []
    if (state.budget) parts.push(`Ngân sách: dưới ${(state.budget / 1_000_000).toFixed(0)} triệu`)
    if (state.brand) parts.push(`Hãng: ${state.brand}`)
    if (state.usage) parts.push(`Nhu cầu: ${state.usage}`)
    if (state.color) parts.push(`Màu: ${state.color}`)
    if (state.designPreference) parts.push(`Phong cách: ${state.designPreference}`)
    if (state.giftFor) parts.push(`Mua tặng: ${state.giftFor}`)
    if (state.ambiguousPreference) parts.push(`Sở thích: ${state.ambiguousPreference}`)
    if (state.lastAction) parts.push(`Hành động trước: ${state.lastAction}`)
    if (state.lastRecommendations?.length) {
      const recs = state.lastRecommendations.map(r => `${r.title} (${Number(r.price).toLocaleString('vi-VN')}đ)`).join(', ')
      parts.push(`Đã gợi ý: ${recs}`)
    }
    return parts.join(' | ')
  }

  private static recoverFromFailure(
    message: string,
    state: Partial<ConversationState>
  ): OrchestrationDecision {
    const newSlots = SlotExtractor.extract(message)
    const mergedState = SlotExtractor.mergeState(state, newSlots)

    const hasBudget = mergedState.budget !== undefined
    const hasPref = mergedState.brand || mergedState.usage || mergedState.color || mergedState.designPreference || mergedState.giftFor

    let response = 'Bạn ơi, cho mình hỏi thêm chút nhé. '
    if (hasBudget && !hasPref) {
      response += `Dưới ${(mergedState.budget! / 1_000_000).toFixed(0)} triệu, bạn có thích hãng nào cụ thể không?`
      return {
        strategy: 'search_products',
        extractedSlots: newSlots,
        mergedState,
        response,
        shouldPersist: true,
        searchFilters: { budget: mergedState.budget },
      }
    }
    if (!hasBudget && hasPref) {
      response += 'Bạn muốn tầm giá khoảng bao nhiêu vậy?'
      return {
        strategy: 'search_products',
        extractedSlots: newSlots,
        mergedState,
        response,
        shouldPersist: true,
        searchFilters: {
          brand: mergedState.brand,
          usage: mergedState.usage,
          color: mergedState.color,
          designPreference: mergedState.designPreference,
          giftFor: mergedState.giftFor,
        },
      }
    }
    if (hasBudget && hasPref) {
      return {
        strategy: 'search_products',
        extractedSlots: newSlots,
        mergedState,
        response: '',
        shouldPersist: true,
        searchFilters: {
          budget: mergedState.budget,
          brand: mergedState.brand,
          usage: mergedState.usage,
          color: mergedState.color,
          designPreference: mergedState.designPreference,
          giftFor: mergedState.giftFor,
        },
      }
    }

    response = 'Bạn muốn tìm điện thoại nào vậy? Cho mình biết thêm ngân sách hoặc hãng bạn thích nhé.'
    return {
      strategy: 'answer_question',
      extractedSlots: newSlots,
      mergedState,
      response,
      shouldPersist: true,
      intent: AIIntent.PRODUCT_SEARCH,
    }
  }

  private static async getHistory(conversationId: string, userId: string): Promise<ConversationTurn[]> {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId, userId },
    })
    if (!conversation) return []

    const messages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })

    const turns: ConversationTurn[] = []
    for (let i = 0; i < messages.length - 1; i += 2) {
      const userMsg = messages[i]
      const botMsg = messages[i + 1]
      if (userMsg && botMsg && userMsg.role === 'user') {
        turns.push({
          userMessage: userMsg.content,
          botMessage: botMsg.content,
          strategy: (botMsg.metadata as { strategy?: string } | null)?.strategy,
        })
      }
    }
    return turns
  }
}
