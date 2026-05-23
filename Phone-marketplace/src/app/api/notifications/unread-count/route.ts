import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/notifications/unread-count - Đếm thông báo chưa đọc
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ count: 0 })
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({ count: unreadCount })
  } catch (error) {
    console.error("GET /api/notifications/unread-count error:", error)
    return NextResponse.json({ count: 0 })
  }
}
