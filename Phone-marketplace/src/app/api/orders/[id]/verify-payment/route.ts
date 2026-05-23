import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { checkSepayOrder } from "@/lib/sepay"

// GET /api/orders/[id]/verify-payment - Kiểm tra và cập nhật payment status từ SePay
export async function GET(
  request: NextRequest,
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
        buyer: { select: { id: true } },
        seller: { select: { id: true } },
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
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    // If already paid, return current status
    if (order.paymentStatus === "SUCCESS") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })
    }

    // If payment method is not SEPAY, no need to verify
    if (order.paymentMethod !== "SEPAY") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })
    }

    // Check with SePay
    const sepayResult = await checkSepayOrder(order.orderCode)

    if (sepayResult.success && sepayResult.data) {
      const sepayStatus = sepayResult.data?.order_status

      // SePay statuses: PENDING, CAPTURED, COMPLETED, SUCCESS, CANCELLED, FAILED
      // CAPTURED = payment successful (used by SePay Sandbox)
      if (sepayStatus === "COMPLETED" || sepayStatus === "SUCCESS" || sepayStatus === "CAPTURED") {
        // Update to paid
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "SUCCESS",
            paidAt: new Date(),
            status: "PAID",
          },
        })

        // Create notification for buyer
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_UPDATED",
            title: "Thanh toán thành công",
            message: `Đơn hàng ${order.orderCode} đã được thanh toán thành công`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        // Create notification for seller
        await prisma.notification.create({
          data: {
            userId: order.sellerId,
            type: "ORDER_PAID",
            title: "Có đơn hàng đã thanh toán",
            message: `Đơn hàng ${order.orderCode} đã được thanh toán. Vui lòng xác nhận và giao hàng`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        return NextResponse.json({
          success: true,
          updated: true,
          paymentStatus: "SUCCESS",
          status: "PAID",
        })
      } else if (sepayStatus === "FAILED" || sepayStatus === "CANCELLED") {
        // Get order items to restore stock
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: order.id },
        })

        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Thanh toán thất bại trên SePay",
          },
        })

        // Restore product stock
        for (const item of orderItems) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          })
        }

        // Create notification for buyer
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_UPDATED",
            title: "Thanh toán thất bại",
            message: `Thanh toán đơn hàng ${order.orderCode} đã thất bại trên SePay. Đơn hàng đã bị hủy.`,
            relatedId: order.id,
            relatedType: "ORDER",
          },
        })

        return NextResponse.json({
          success: true,
          updated: true,
          paymentStatus: "FAILED",
          status: "CANCELLED",
        })
      }
    }

    // If SePay check fails or status is still pending, return current status
    console.log(`[Verify-Payment] Order ${order.orderCode} status: ${order.paymentStatus}, SePay status: ${sepayResult.data?.order_status || 'unknown'}`)

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      paymentStatus: order.paymentStatus,
      status: order.status,
      message: order.paymentStatus === "PENDING" ? "Chờ thanh toán" : "Chờ cập nhật từ webhook",
    })
  } catch (error) {
    console.error("Verify payment error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
