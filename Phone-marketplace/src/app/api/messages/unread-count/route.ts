import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/messages/unread-count - Đếm tin nhắn chưa đọc
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ count: 0 })
    }

    // Count unread messages across all conversations
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId: session.user.id },
      select: { conversationId: true },
    })

    const conversationIds = conversations.map(cp => cp.conversationId)

    if (conversationIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    // Count messages not sent by current user and not read
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: session.user.id },
        readAt: null,
      },
    })

    return NextResponse.json({ count: unreadCount })
  } catch (error) {
    console.error("GET /api/messages/unread-count error:", error)
    return NextResponse.json({ count: 0 })
  }
}
