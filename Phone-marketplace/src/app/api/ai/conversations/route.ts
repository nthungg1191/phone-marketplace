import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIShoppingService } from '@/lib/ai/shopping-service'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const conversations = await AIShoppingService.getConversations(session.user.id)

    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error('AI Conversations API error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi server' },
      { status: 500 }
    )
  }
}
