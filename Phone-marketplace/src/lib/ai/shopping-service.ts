import { prisma } from '@/lib/prisma'
import { VertexAIService } from './vertex-ai'
import { type ConversationState, type RecommendationSnapshot } from './slot-extractor'
import { AIOrchestrator, type Strategy } from './ai-orchestrator'
import { AIIntent, type AIConversation, type AIMessage } from '@prisma/client'

export interface ChatResponse {
  message: string
  htmlMessage?: string
  intent: AIIntent
  strategy: Strategy
  conversationId: string
  state?: Partial<ConversationState>
}

export interface SuggestedAction {
  label: string
  value: string
  type: 'search' | 'compare' | 'order' | 'policy' | 'quick_reply'
}

function formatNowVi(): string {
  const now = new Date()
  const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('vi-VN')
  return `${time} ngày ${date}`
}

function replaceDynamicPlaceholders(text: string): string {
  if (!text) return text
  const nowStr = formatNowVi()
  return text
    .replace(/\[NOW\]/g, nowStr)
    .replace(/\[giờ hiện tại\]/gi, nowStr)
    .replace(/\[ngày hiện tại\]/gi, nowStr)
}

type ProductFromDb = {
  id: number
  title: string
  price: bigint
  brand: { name: string }
  color: string
  batteryHealth: number
  ramGb: number
  storageGb: number
  condition: string
  slug: string
  seller?: { name: string; isVerified?: boolean | null; sellerRank?: string | null }
}

export class AIShoppingService {
  static async chat(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    let conversation: AIConversation

    if (conversationId) {
      const existing = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
      })
      if (!existing || existing.userId !== userId) {
        throw new Error('Conversation not found or access denied')
      }
      conversation = existing
    } else {
      conversation = await prisma.aIConversation.create({
        data: { userId },
      })
    }

    const currentState = (conversation.state as Partial<ConversationState>) || null
    const history = await this.getChatHistory(conversation.id)

    const decision = await AIOrchestrator.decide(
      message,
      userId,
      conversation.id,
      currentState
    )

    let responseText = decision.response
    let responseHtml: string | undefined
    let newState: Partial<ConversationState> | null = decision.shouldPersist ? decision.mergedState : currentState

    if (decision.strategy === 'search_products' && decision.searchFilters) {
      const rawProducts = await this.searchProducts(decision.searchFilters)
      if (rawProducts.length > 0) {
        const products = rawProducts.map(p => ({
          id: Number(p.id),
          title: p.title,
          price: Number(p.price),
          brand: p.brand.name,
          color: p.color,
          batteryHealth: p.batteryHealth,
          ramGb: p.ramGb,
          storageGb: p.storageGb,
          condition: p.condition,
          slug: p.slug,
          seller: p.seller ? {
            name: p.seller.name,
            isVerified: p.seller.isVerified ?? undefined,
            sellerRank: p.seller.sellerRank ?? undefined,
          } : undefined,
        }))
        newState = this.attachRecommendationMemory(newState, rawProducts, 'search')
        const llmResponse = await VertexAIService.generateWithProducts(
          history,
          newState,
          products,
          message
        )
        responseText = llmResponse.text
        responseHtml = llmResponse.htmlText
      } else {
        responseText = `Ủa, mình không tìm thấy máy nào phù hợp với tiêu chí đó cả. Bạn thử điều chỉnh ngân sách hoặc hãng khác xem sao nhé.`
      }
    }

    if (decision.strategy === 'answer_question') {
      const llmRes = await VertexAIService.generateNaturalResponse(
        history,
        newState || currentState,
        message
      )
      responseText = llmRes.text
    }

    if (decision.strategy === 'order_support') {
      responseText = await this.handleOrderSupport(userId, newState, history, message)
    }

    if (decision.strategy === 'payment_support') {
      const llmRes = await VertexAIService.generateNaturalResponse(
        history,
        newState || currentState,
        message
      )
      responseText = llmRes.text
    }

    if (decision.strategy === 'return_support') {
      const llmRes = await VertexAIService.generateNaturalResponse(
        history,
        newState || currentState,
        message
      )
      responseText = llmRes.text
    }

    if (decision.strategy === 'policy_faq') {
      const llmRes = await VertexAIService.generateNaturalResponse(
        history,
        newState || currentState,
        message
      )
      responseText = llmRes.text
    }

    if (decision.strategy === 'account_navigation') {
      const llmRes = await VertexAIService.generateNaturalResponse(
        history,
        newState || currentState,
        message
      )
      responseText = llmRes.text
    }

    responseText = replaceDynamicPlaceholders(responseText)
    if (responseHtml) responseHtml = replaceDynamicPlaceholders(responseHtml)

    await this.saveTurn(
      conversation.id,
      message,
      responseText,
      newState,
      decision.strategy,
      decision.extractedSlots,
      responseHtml
    )

    return {
      message: responseText,
      htmlMessage: responseHtml,
      intent: decision.intent || AIIntent.PRODUCT_SEARCH,
      strategy: decision.strategy,
      conversationId: conversation.id,
      state: newState,
    }
  }

  private static async searchProducts(filters: {
    budget?: number
    brand?: string
    usage?: string
    color?: string
    designPreference?: string
    giftFor?: string
    camera?: string
    battery?: string
  }): Promise<ProductFromDb[]> {
    const where: Record<string, unknown> = { status: 'ACTIVE' }

    if (filters.budget) {
      where.price = { lte: filters.budget }
    }
    if (filters.brand) {
      where.brand = { name: { equals: filters.brand, mode: 'insensitive' } }
    }
    if (filters.usage === 'gaming') {
      where.ramGb = { gte: 8 }
    }

    const raw = await prisma.product.findMany({
      where,
      orderBy: [
        { price: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 50,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        brand: true,
        seller: { select: { name: true, isVerified: true, sellerRank: true } },
      },
    })

    const normalizedBrand = filters.brand?.trim().toLowerCase()
    const brandFiltered = normalizedBrand
      ? raw.filter(product => product.brand.name.trim().toLowerCase() === normalizedBrand)
      : raw

    const seen = new Set<string>()
    const deduped: ProductFromDb[] = []
    for (const p of brandFiltered) {
      if (!seen.has(String(p.id))) {
        seen.add(String(p.id))
        deduped.push(p as unknown as ProductFromDb)
      }
    }

    if (filters.color) {
      const colorLower = filters.color.toLowerCase()
      const colorFiltered = deduped.filter(p =>
        p.color.toLowerCase().includes(colorLower) ||
        p.title.toLowerCase().includes(colorLower)
      )
      if (colorFiltered.length > 0) {
        return colorFiltered.slice(0, 8)
      }
    }

    return deduped.slice(0, 8)
  }

  private static buildRecommendationSnapshots(
    products: ProductFromDb[]
  ): RecommendationSnapshot[] {
    return products.slice(0, 8).map(product => ({
      productId: Number(product.id),
      title: product.title,
      brand: product.brand.name,
      color: product.color,
      price: Number(product.price),
    }))
  }

  private static attachRecommendationMemory(
    state: Partial<ConversationState> | null,
    products: ProductFromDb[],
    lastAction: ConversationState['lastAction']
  ): Partial<ConversationState> {
    return {
      ...(state || {}),
      lastAction,
      supportTopic: 'product',
      lastQuestionType: 'product_choice',
      lastRecommendations: this.buildRecommendationSnapshots(products),
    }
  }

  private static async handleOrderSupport(
    userId: string,
    state: Partial<ConversationState> | null,
    history: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>,
    userMessage: string
  ): Promise<string> {
    const orders = await prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        items: {
          include: {
            product: { select: { title: true, images: { where: { isPrimary: true }, take: 1 } } },
          },
        },
      },
    })

    if (orders.length === 0) {
      return `Bạn chưa có đơn hàng nào trên HNT Marketplace cả. Cần mình tư vấn tìm máy không?`
    }

    const statusLabels: Record<string, string> = {
      PENDING_PAYMENT: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      CONFIRMED: 'Đã xác nhận',
      SHIPPING: 'Đang giao hàng',
      DELIVERED: 'Đã giao hàng',
      RETURN_PERIOD: 'Đang dùng thử (14 ngày)',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    }

    const latest = orders[0]
    const item = latest.items[0]
    const productName = item?.product?.title || 'Sản phẩm'
    const status = statusLabels[latest.status] || latest.status
    const date = new Date(latest.createdAt).toLocaleDateString('vi-VN')

    return `Đơn mới nhất của bạn là ${latest.orderCode} — ${productName}. Trạng thái: ${status}, tạo ngày ${date}. Bạn cần mình hỗ trợ gì thêm về đơn này không?`
  }

  private static async saveTurn(
    conversationId: string,
    userMessage: string,
    botMessage: string,
    state: Partial<ConversationState> | null,
    strategy: Strategy,
    slots: Partial<ConversationState>,
    htmlText?: string
  ) {
    const strategyToIntent: Record<Strategy, AIIntent> = {
      search_products: AIIntent.PRODUCT_SEARCH,
      answer_question: AIIntent.PRODUCT_QUESTION,
      order_support: AIIntent.ORDER_SUPPORT,
      payment_support: AIIntent.PAYMENT_SUPPORT,
      return_support: AIIntent.RETURN_REFUND,
      policy_faq: AIIntent.POLICY_FAQ,
      account_navigation: AIIntent.POLICY_FAQ,
    }

    const intent = strategyToIntent[strategy] || AIIntent.PRODUCT_SEARCH

    await prisma.$transaction(async (tx) => {
      await tx.aIMessage.create({
        data: {
          conversationId,
          role: 'user',
          content: userMessage,
          intent,
          metadata: { strategy, slots } as object,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgData: any = {
        conversationId,
        role: 'assistant',
        content: botMessage,
        intent,
        metadata: { strategy, state } as object,
      }
      if (htmlText) msgData.htmlContent = htmlText
      await tx.aIMessage.create({ data: msgData })

      const conv = await tx.aIConversation.findUnique({
        where: { id: conversationId },
        select: { intentCounts: true },
      })
      const counts = (conv?.intentCounts as Record<string, number>) || {}
      counts[intent] = (counts[intent] || 0) + 1

      const cleanState: Record<string, unknown> = {}
      if (state) {
        for (const [k, v] of Object.entries(state)) {
          if (v !== undefined) cleanState[k] = v
        }
      }

      await tx.aIConversation.update({
        where: { id: conversationId },
        data: {
          state: cleanState as object,
          intentCounts: counts,
        },
      })
    })
  }

  private static async getChatHistory(
    conversationId: string
  ): Promise<Array<{ role: 'user' | 'assistant' | 'model'; content: string }>> {
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    return messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })) as Array<{ role: 'user' | 'assistant' | 'model'; content: string }>
  }

  static async getHistory(
    userId: string,
    conversationId: string,
    limit = 50
  ): Promise<AIMessage[]> {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found or access denied')
    }

    return prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  static async getConversations(userId: string): Promise<AIConversation[]> {
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
  }

  static async getAnalytics(): Promise<{
    totalConversations: number
    intentDistribution: Record<string, number>
  }> {
    const conversations = await prisma.aIConversation.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { intentCounts: true },
    })

    const distribution: Record<string, number> = {}

    for (const conv of conversations) {
      const counts = conv.intentCounts as Record<string, number> || {}
      for (const [intent, count] of Object.entries(counts)) {
        distribution[intent] = (distribution[intent] || 0) + count
      }
    }

    return {
      totalConversations: conversations.length,
      intentDistribution: distribution,
    }
  }
}
