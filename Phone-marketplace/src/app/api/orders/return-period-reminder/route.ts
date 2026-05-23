import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// API endpoint để gửi notification nhắc nhở sắp hết hạn return period
// Gọi bằng cron job - Schedule: chạy mỗi ngày
// Gửi reminder khi còn 3 ngày và 1 ngày

// GET /api/orders/return-period-reminder - Gửi reminder sắp hết hạn
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra authorization
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const now = new Date()
    
    // Tính thời điểm nhắc nhở
    const reminderDays = [3, 1] // Nhắc trước 3 ngày và 1 ngày
    
    const reminders = []
    
    for (const days of reminderDays) {
      const reminderTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      const reminderStart = new Date(reminderTime.getTime() - 60 * 60 * 1000) // Trong vòng 1 tiếng
      const reminderEnd = new Date(reminderTime.getTime() + 60 * 60 * 1000)
      
      // Tìm đơn hàng sẽ hết hạn trong khoảng thời gian reminder
      const ordersToRemind = await prisma.order.findMany({
        where: {
          status: {
            in: ["DELIVERED", "RETURN_PERIOD"],
          },
          returnPeriodStartedAt: { not: null },
          returnPeriodEndsAt: {
            gte: reminderStart,
            lte: reminderEnd,
          },
          // Chưa gửi reminder cho ngày này
          OR: [
            // Check bằng cách query notification gần đây (simplified)
            { returnRequest: null },
            { returnRequest: { status: { in: ["CANCELLED", "SELLER_REJECTED", "ADMIN_REJECTED"] } } },
          ],
        },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true } },
        },
      })

      for (const order of ordersToRemind) {
        // Kiểm tra đã gửi reminder chưa (đơn giản - có thể cải thiện bằng cách lưu vào order field)
        const existingReminder = await prisma.notification.findFirst({
          where: {
            userId: order.buyerId,
            relatedId: order.id,
            type: "ORDER_RETURN_PERIOD_REMINDER",
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Trong 24h qua
            },
          },
        })

        if (existingReminder) continue

        // Tính số ngày còn lại
        const daysLeft = Math.ceil(
          (order.returnPeriodEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )

        // Gửi notification
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_RETURN_PERIOD_REMINDER",
            title: `Còn ${daysLeft} ngày dùng thử`,
            message: `Đơn hàng ${order.orderCode} còn ${daysLeft} ngày dùng thử. Nếu hài lòng, bạn không cần làm gì. Nếu muốn trả hàng, vui lòng gửi yêu cầu trước khi hết hạn.`,
            relatedId: order.id,
            relatedType: "ORDER",
            data: {
              daysLeft,
              expiresAt: order.returnPeriodEndsAt!.toISOString(),
            },
          },
        })

        reminders.push({
          orderId: order.id,
          orderCode: order.orderCode,
          daysLeft,
          userId: order.buyerId,
        })

        console.log(`[RETURN-PERIOD-REMINDER] Sent reminder for order ${order.orderCode}, ${daysLeft} days left`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi ${reminders.length} notification nhắc nhở`,
      reminders,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("[RETURN-PERIOD-REMINDER] Error:", error)
    return NextResponse.json(
      { error: "Lỗi khi gửi reminder" },
      { status: 500 }
    )
  }
}
