import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// PATCH /api/notifications - Đánh dấu đã đọc
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, all } = body

    if (all) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ message: "Đã đánh dấu tất cả là đã đọc" })
    }

    if (notificationId) {
      // Mark single as read
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      })

      if (!notification) {
        return NextResponse.json({ error: "Không tìm thấy thông báo" }, { status: 404 })
      }

      if (notification.userId !== session.user.id) {
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      })

      return NextResponse.json({ message: "Đã đánh dấu là đã đọc" })
    }

    return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 })
  } catch (error) {
    console.error("PATCH /api/notifications error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
