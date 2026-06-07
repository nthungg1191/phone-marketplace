import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIShoppingService } from '@/lib/ai/shopping-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const { id } = await params
    const messages = await AIShoppingService.getHistory(
      session.user.id,
      id
    )

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('AI History API error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi server' },
      { status: 500 }
    )
  }
}
