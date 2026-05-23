import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySepayWebhook, parseSepayWebhook } from "@/lib/sepay"

// POST /api/sepay/webhook - Nhận callback từ SePay
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = parseSepayWebhook(body)

    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Verify signature
    if (payload.signature) {
      const secretKey = process.env.SEPAY_SECRET_KEY || ''
      if (secretKey && !verifySepayWebhook(payload, payload.signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
      }
    }

    const { order_invoice_number, order_status } = payload

    // Find order by order code
    const order = await prisma.order.findFirst({
      where: { orderCode: order_invoice_number },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if payment is already processed
    if (order.paymentStatus === "SUCCESS") {
      return NextResponse.json({ message: "Already processed" })
    }

    // Process payment based on status
    // SePay statuses: PENDING, CAPTURED, COMPLETED, SUCCESS, CANCELLED, FAILED
    // Note: In sandbox mode, CAPTURED is used to indicate successful payment
    if (order_status === "COMPLETED" || order_status === "SUCCESS" || order_status === "CAPTURED") {
      // Update order payment status
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

      console.log(`[SePay Webhook] Payment confirmed for order ${order_invoice_number}`)
    } else if (order_status === "PENDING") {
      // In sandbox, PENDING means user is in the middle of payment - no action needed
      console.log(`[SePay Webhook] Payment pending for order ${order_invoice_number}`)
      return NextResponse.json({ message: "Pending" })
    } else if (order_status === "FAILED" || order_status === "CANCELLED") {
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
          cancelReason: "Thanh toán thất bại hoặc bị hủy",
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
          message: `Thanh toán đơn hàng ${order.orderCode} đã thất bại hoặc bị hủy. Đơn hàng đã bị hủy.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })
    }

    return NextResponse.json({ message: "OK" })
  } catch (error) {
    console.error("Sepay webhook error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// GET /api/sepay/webhook - Health check
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
}
