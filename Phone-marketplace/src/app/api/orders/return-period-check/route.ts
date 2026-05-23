import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// API endpoint để tự động complete đơn hàng sau 14 ngày return period
// Gọi bằng cron job (VD: Vercel Cron, GitHub Actions)
// Schedule: chạy mỗi giờ hoặc mỗi 6 giờ

// GET /api/orders/return-period-check - Kiểm tra và auto-complete đơn hàng quá 14 ngày
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
    
    // Tìm các đơn hàng:
    // 1. Đang ở trạng thái DELIVERED hoặc RETURN_PERIOD
    // 2. Đã bắt đầu return period (returnPeriodStartedAt không null)
    // 3. Đã hết hạn return period (returnPeriodEndsAt < now)
    // 4. Không có return request đang xử lý (hoặc đã bị từ chối)
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ["DELIVERED", "RETURN_PERIOD"],
        },
        returnPeriodStartedAt: { not: null },
        returnPeriodEndsAt: {
          lt: now,
        },
        OR: [
          { returnRequest: null },
          { returnRequest: { status: { in: ["CANCELLED", "SELLER_REJECTED", "ADMIN_REJECTED"] } } },
        ],
      },
      include: {
        returnRequest: true,
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true } },
      },
    })

    if (expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Không có đơn hàng nào hết hạn return period",
        completed: 0,
      })
    }

    const completedResults = []
    
    for (const order of expiredOrders) {
      try {
        // Cập nhật trạng thái đơn hàng thành COMPLETED
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
            buyerConfirmed: true,
            buyerConfirmedAt: now,
          },
        })

        // Tạo notification cho Buyer
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_UPDATED",
            title: "Đơn hàng đã hoàn thành",
            message: `Đơn hàng ${order.orderCode} đã được tự động xác nhận hoàn thành sau 14 ngày dùng thử.`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        // Tạo notification cho Seller
        await prisma.notification.create({
          data: {
            userId: order.sellerId,
            type: "ORDER_UPDATED",
            title: "Đơn hàng đã hoàn thành",
            message: `Đơn hàng ${order.orderCode} đã được tự động xác nhận hoàn thành sau 14 ngày dùng thử.`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        completedResults.push({
          orderId: order.id,
          orderCode: order.orderCode,
          status: "completed",
        })

        console.log(`[RETURN-PERIOD-CHECK] Auto-completed order ${order.orderCode}`)
      } catch (error) {
        console.error(`[RETURN-PERIOD-CHECK] Error completing order ${order.id}:`, error)
        completedResults.push({
          orderId: order.id,
          orderCode: order.orderCode,
          status: "error",
          error: String(error),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${expiredOrders.length} đơn hàng hết hạn return period`,
      completed: completedResults.filter(r => r.status === "completed").length,
      errors: completedResults.filter(r => r.status === "error").length,
      results: completedResults,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("[RETURN-PERIOD-CHECK] Error:", error)
    return NextResponse.json(
      { error: "Lỗi khi kiểm tra return period" },
      { status: 500 }
    )
  }
}
