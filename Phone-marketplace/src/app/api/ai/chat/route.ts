import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIShoppingService, type ChatResponse } from '@/lib/ai/shopping-service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để sử dụng AI Assistant' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, conversationId } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tin nhắn không hợp lệ' },
        { status: 400 }
      )
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Tin nhắn quá dài (tối đa 500 ký tự)' },
        { status: 400 }
      )
    }

    const response: ChatResponse = await AIShoppingService.chat(
      session.user.id,
      message.trim(),
      conversationId
    )

    return NextResponse.json(response)
  } catch (error: unknown) {
    console.error('AI Chat API error:', error)
    const message = error instanceof Error ? error.message : 'Lỗi server. Vui lòng thử lại.'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
