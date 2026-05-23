import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createSepayPayment } from "@/lib/sepay"

// POST /api/sepay/create - Tạo thanh toán SePay
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: "Thiếu orderId" }, { status: 400 })
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Check if user owns this order
    if (order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    // Check payment method
    if (order.paymentMethod !== "SEPAY") {
      return NextResponse.json({ error: "Đơn hàng không sử dụng SePay" }, { status: 400 })
    }

    // Check if already paid
    if (order.paymentStatus === "SUCCESS") {
      return NextResponse.json({ error: "Đơn hàng đã thanh toán" }, { status: 400 })
    }

    // Create SePay payment using SDK
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const result = await createSepayPayment({
      amount: Number(order.totalAmount),
      orderCode: order.orderCode,
      description: `Thanh toan don hang ${order.orderCode}`,
      customerId: session.user.id,
      paymentMethod: "BANK_TRANSFER",
      successUrl: `${appUrl}/checkout/success?orderId=${order.id}`,
      errorUrl: `${appUrl}/checkout/success?orderId=${order.id}&error=payment_failed`,
      cancelUrl: `${appUrl}/checkout/cancelled?orderId=${order.id}`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Update order with order invoice number (for tracking)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId: order.orderCode, // Use orderCode as transaction reference
      },
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      formFields: result.formFields,
    })
  } catch (error) {
    console.error("POST /api/sepay/create error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
