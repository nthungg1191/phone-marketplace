import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// API endpoint để kiểm tra và hủy đơn hàng quá hạn thanh toán
// Có thể gọi bằng cron job (VD: Vercel Cron, GitHub Actions, hoặc systemd timer)
// Hoặc có thể gọi khi user truy cập trang orders

// GET /api/orders/expire-check - Kiểm tra và hủy đơn hàng quá hạn
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra authorization (có thể thêm secret key để bảo mật)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    // Nếu có cron secret được set, yêu cầu phải có header đúng
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Trong môi trường development, cho phép gọi không cần auth
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const now = new Date()
    
    // Tìm các đơn hàng:
    // 1. Đang ở trạng thái PENDING_PAYMENT
    // 2. Chưa thanh toán (paymentStatus = PENDING)
    // 3. Đã quá hạn thanh toán (paymentDeadline < now)
    // 4. Phương thức thanh toán là SEPAY (COD thì không cần check)
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        paymentMethod: "SEPAY",
        paymentDeadline: {
          lt: now,
        },
      },
      include: {
        items: true,
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true } },
      },
    })

    if (expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Không có đơn hàng nào quá hạn",
        cancelled: 0,
      })
    }

    // Hủy từng đơn hàng quá hạn
    const cancelledResults = []
    
    for (const order of expiredOrders) {
      try {
        // Cập nhật trạng thái đơn hàng thành CANCELLED
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            paymentStatus: "FAILED",
            cancelledAt: now,
            cancelReason: "Hết thời hạn thanh toán (30 phút)",
          },
        })

        // Hoàn lại stock cho các sản phẩm
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          })
        }

        // Tạo thông báo cho người mua
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_UPDATED",
            title: "Đơn hàng đã bị hủy",
            message: `Đơn hàng ${order.orderCode} đã bị hủy do hết thời hạn thanh toán. Bạn có thể đặt hàng lại nếu sản phẩm còn hàng.`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        // Tạo thông báo cho người bán
        await prisma.notification.create({
          data: {
            userId: order.sellerId,
            type: "ORDER_UPDATED",
            title: "Đơn hàng bị hủy",
            message: `Đơn hàng ${order.orderCode} đã bị hủy do người mua không thanh toán trong thời hạn.`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        cancelledResults.push({
          orderId: order.id,
          orderCode: order.orderCode,
          status: "cancelled",
        })

        console.log(`[EXPIRE-CHECK] Cancelled order ${order.orderCode}`)
      } catch (error) {
        console.error(`[EXPIRE-CHECK] Error cancelling order ${order.id}:`, error)
        cancelledResults.push({
          orderId: order.id,
          orderCode: order.orderCode,
          status: "error",
          error: String(error),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${expiredOrders.length} đơn hàng quá hạn`,
      cancelled: cancelledResults.filter(r => r.status === "cancelled").length,
      errors: cancelledResults.filter(r => r.status === "error").length,
      results: cancelledResults,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("[EXPIRE-CHECK] Error:", error)
    return NextResponse.json(
      { error: "Lỗi khi kiểm tra đơn hàng quá hạn" },
      { status: 500 }
    )
  }
}
