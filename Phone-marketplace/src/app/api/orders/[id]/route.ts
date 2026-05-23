import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateOrderSchema = z.object({
  action: z.enum([
    "CONFIRM", "CANCEL", "CANCEL_PAYMENT", "SHIPPING", "DELIVER", "RECEIVE", "COMPLETE", "REFUND",
    "CONFIRM_PAYMENT", "REJECT_PAYMENT",
    // Return Period actions
    "CONFIRM_SATISFIED",    // Buyer hài lòng → COMPLETED ngay
  ]),
  reason: z.string().optional(),
})

// GET /api/orders/[id] - Chi tiết đơn hàng
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        seller: { select: { id: true, name: true, sellerRank: true, sellerStats: true } },
        items: {
          include: {
            product: {
              include: {
                brand: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payment: true,
        returnRequest: true,
        reviews: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Check access
    const isBuyer = order.buyerId === session.user.id
    const isSeller = order.sellerId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/orders/[id] - Cập nhật đơn hàng
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, reason } = updateOrderSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        returnRequest: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    const isBuyer = order.buyerId === session.user.id
    const isSeller = order.sellerId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    const updateData: Record<string, unknown> = {}
    let notification: { userId: string; title: string; message: string } | null = null

    switch (action) {
      case "CONFIRM":
        // Seller confirms order
        if (!isSeller && !isAdmin) {
          return NextResponse.json({ error: "Chỉ người bán có thể xác nhận" }, { status: 403 })
        }
        // COD: đơn đã ở CONFIRMED khi tạo → không cần xác nhận lại
        if (order.status === "CONFIRMED") {
          return NextResponse.json({ message: "Đơn hàng đã được xác nhận" })
        }
        // SEPAY: cần PAID mới confirm được
        if (order.paymentMethod === "SEPAY" && order.status !== "PENDING_PAYMENT" && order.status !== "PAID") {
          return NextResponse.json({ error: "Cần thanh toán trước khi xác nhận" }, { status: 400 })
        }
        // COD: cho phép confirm từ PENDING_PAYMENT
        if (order.status !== "PENDING_PAYMENT" && order.status !== "PAID") {
          return NextResponse.json({ error: "Không thể xác nhận ở trạng thái này" }, { status: 400 })
        }
        updateData.status = "CONFIRMED"
        updateData.confirmedAt = new Date()
        notification = {
          userId: order.buyerId,
          title: "Đơn hàng đã được xác nhận",
          message: `Đơn hàng ${order.orderCode} đã được xác nhận`,
        }
        break

      case "SHIPPING":
        // Seller ships order
        if (!isSeller && !isAdmin) {
          return NextResponse.json({ error: "Chỉ người bán có thể giao hàng" }, { status: 403 })
        }
        if (order.status !== "CONFIRMED") {
          return NextResponse.json({ error: "Cần xác nhận đơn hàng trước" }, { status: 400 })
        }
        updateData.status = "SHIPPING"
        updateData.shippedAt = new Date()
        notification = {
          userId: order.buyerId,
          title: "Đơn hàng đang được giao",
          message: `Đơn hàng ${order.orderCode} đang được giao đến bạn`,
        }
        break

      case "DELIVER":
        // Buyer confirms delivery from shipping
        if (!isBuyer && !isAdmin) {
          return NextResponse.json({ error: "Chỉ người mua có thể xác nhận đã nhận" }, { status: 403 })
        }
        if (order.status !== "SHIPPING") {
          return NextResponse.json({ error: "Đơn hàng chưa được giao" }, { status: 400 })
        }
        // DELIVER → DELIVERED (chờ buyer kiểm tra hàng)
        updateData.status = "DELIVERED"
        updateData.deliveredAt = new Date()
        notification = {
          userId: order.sellerId,
          title: "Người mua đã nhận hàng",
          message: `Người mua đã xác nhận nhận được đơn hàng ${order.orderCode}. Vui lòng đợi người mua kiểm tra và xác nhận.`,
        }
        break

      case "RECEIVE":
        // Buyer kiểm tra và chấp nhận hàng → Bắt đầu Return Period
        if (!isBuyer && !isAdmin) {
          return NextResponse.json({ error: "Chỉ người mua có thể xác nhận" }, { status: 403 })
        }
        if (order.status !== "DELIVERED") {
          return NextResponse.json({ error: "Đơn hàng chưa được giao" }, { status: 400 })
        }
        if (order.returnPeriodStartedAt) {
          return NextResponse.json({ error: "Đã bắt đầu return period rồi" }, { status: 400 })
        }
        // RECEIVED → RETURN_PERIOD (14 ngày dùng thử)
        updateData.status = "RETURN_PERIOD"
        updateData.returnPeriodStartedAt = new Date()
        updateData.returnPeriodEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        notification = {
          userId: order.sellerId,
          title: "Bắt đầu thời gian dùng thử",
          message: `Đơn hàng ${order.orderCode} đã bắt đầu 14 ngày dùng thử. Người mua có thể yêu cầu trả hàng nếu không hài lòng.`,
        }
        break

      case "CONFIRM_SATISFIED":
        // Buyer hài lòng → COMPLETED ngay (không cần đợi 14 ngày)
        if (!isBuyer && !isAdmin) {
          return NextResponse.json({ error: "Chỉ người mua có thể xác nhận" }, { status: 403 })
        }
        if (!["RETURN_PERIOD"].includes(order.status)) {
          return NextResponse.json({ error: "Đơn hàng không trong thời gian dùng thử" }, { status: 400 })
        }
        updateData.status = "COMPLETED"
        updateData.completedAt = new Date()
        updateData.buyerConfirmed = true
        updateData.buyerConfirmedAt = new Date()
        notification = {
          userId: order.sellerId,
          title: "Đơn hàng đã hoàn thành",
          message: `Người mua đã xác nhận hài lòng với đơn hàng ${order.orderCode}`,
        }
        break

      case "COMPLETE":
        // Complete order (fallback - có thể trigger từ cron job hoặc buyer chủ động)
        if (!isBuyer && !isAdmin) {
          return NextResponse.json({ error: "Chỉ người mua có thể hoàn thành" }, { status: 403 })
        }
        if (!["RETURN_PERIOD"].includes(order.status)) {
          return NextResponse.json({ error: "Cần xác nhận đã nhận hàng trước" }, { status: 400 })
        }
        // Không cho COMPLETE nếu đang có return request đang xử lý
        if (order.returnRequest && !["CANCELLED", "SELLER_REJECTED", "ADMIN_REJECTED"].includes(order.returnRequest.status)) {
          return NextResponse.json({ error: "Đơn hàng đang trong quá trình xử lý trả hàng" }, { status: 400 })
        }
        updateData.status = "COMPLETED"
        updateData.completedAt = new Date()
        updateData.buyerConfirmed = true
        updateData.buyerConfirmedAt = new Date()
        notification = {
          userId: order.sellerId,
          title: "Đơn hàng đã hoàn thành",
          message: `Người mua đã xác nhận hoàn thành đơn hàng ${order.orderCode}`,
        }
        break

      case "CANCEL":
        // Cancel order
        if (!isBuyer && !isSeller && !isAdmin) {
          return NextResponse.json({ error: "Không có quyền hủy" }, { status: 403 })
        }
        if (["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status)) {
          return NextResponse.json({ error: "Không thể hủy đơn hàng này" }, { status: 400 })
        }
        updateData.status = "CANCELLED"
        updateData.cancelledAt = new Date()
        updateData.cancelReason = reason || "Hủy bởi người dùng"
        
        // Restore product stock
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              status: "ACTIVE",
            },
          })
        }
        
        notification = {
          userId: isBuyer ? order.sellerId : order.buyerId,
          title: "Đơn hàng đã bị hủy",
          message: `Đơn hàng ${order.orderCode} đã bị hủy: ${reason || "Không có lý do"}`,
        }
        break

      case "CANCEL_PAYMENT":
        // Cancel payment - buyer decided not to pay
        if (!isBuyer) {
          return NextResponse.json({ error: "Chỉ người mua có thể hủy thanh toán" }, { status: 403 })
        }
        if (order.paymentStatus !== "PENDING") {
          return NextResponse.json({ error: "Đơn hàng đã được thanh toán hoặc không thể hủy" }, { status: 400 })
        }
        // Cancel the entire order since payment wasn't completed
        updateData.status = "CANCELLED"
        updateData.paymentStatus = "FAILED"
        updateData.cancelledAt = new Date()
        updateData.cancelReason = reason || "Người mua hủy thanh toán"
        
        // Restore product stock
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              status: "ACTIVE",
            },
          })
        }
        
        notification = {
          userId: order.sellerId,
          title: "Đơn hàng đã bị hủy",
          message: `Đơn hàng ${order.orderCode} đã bị hủy do người mua không thanh toán.`,
        }
        break

      default:
        return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: true,
      },
    })

    // Create notification
    if (notification) {
      await prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.title.includes("dùng thử") ? "ORDER_RETURN_PERIOD_STARTED" : "ORDER_UPDATED",
          title: notification.title,
          message: notification.message,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/orders/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
