import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifySepayWebhook,
  parseSepayWebhook,
  isAllowedIp,
  isProduction,
  getWebhookSecret,
  SepayCallbackData,
} from "@/lib/sepay"

/**
 * SePay Webhook Handler - Production Ready
 *
 * Security features:
 * - HMAC-SHA256 signature verification (per SePay docs)
 * - Replay attack protection (timestamp validation)
 * - IP whitelist (optional)
 * - Payload validation
 * - Idempotency (skip if already processed)
 *
 * Docs: https://developer.sepay.vn/en/sepay-webhooks
 */

// POST /api/sepay/webhook - Nhận callback từ SePay Payment Gateway
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ===========================================
    // 1. Get client IP
    // ===========================================
    const forwarded = request.headers.get("x-forwarded-for")
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") ?? null

    // ===========================================
    // 2. Read raw body (CRITICAL for HMAC verification)
    // ===========================================
    const rawBody = await request.text()
    if (!rawBody) {
      return NextResponse.json({ success: false, message: "Empty body" }, { status: 400 })
    }

    // ===========================================
    // 3. Get signature headers
    // ===========================================
    const signature = request.headers.get("x-sepay-signature") ?? ""
    const timestampHeader = request.headers.get("x-sepay-timestamp")
    const timestamp = timestampHeader ? parseInt(timestampHeader, 10) : 0

    // ===========================================
    // 4. Verify HMAC-SHA256 signature
    // ===========================================
    const webhookSecret = getWebhookSecret()

    if (webhookSecret) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          { success: false, message: "Missing signature or timestamp headers" },
          { status: 401 }
        )
      }

      const isValid = verifySepayWebhook(rawBody, signature, timestamp)
      if (!isValid) {
        console.warn(`[SePay Webhook] Invalid signature from IP: ${clientIp}`)
        return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 })
      }
    } else if (isProduction()) {
      // In production, webhook secret is REQUIRED
      console.error("[SePay Webhook] SEPAY_WEBHOOK_SECRET is not set in production!")
      return NextResponse.json(
        { success: false, message: "Webhook secret not configured" },
        { status: 500 }
      )
    }

    // ===========================================
    // 5. Parse and validate payload
    // ===========================================
    let parsedBody: Record<string, unknown>
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 })
    }

    const payload = parseSepayWebhook(parsedBody)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Invalid payload structure" }, { status: 400 })
    }

    const { order_invoice_number, order_status, order_amount } = payload

    // ===========================================
    // 6. IP Whitelist check (optional)
    // ===========================================
    if (clientIp && !isAllowedIp(clientIp) && isProduction()) {
      console.warn(`[SePay Webhook] Blocked IP: ${clientIp}`)
      return NextResponse.json({ success: false, message: "IP not allowed" }, { status: 403 })
    }

    // ===========================================
    // 7. Find order
    // ===========================================
    const order = await prisma.order.findFirst({
      where: { orderCode: order_invoice_number },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    })

    if (!order) {
      console.warn(`[SePay Webhook] Order not found: ${order_invoice_number}`)
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    // ===========================================
    // 8. Idempotency - skip if already processed
    // ===========================================
    if (order.paymentStatus === "SUCCESS") {
      return NextResponse.json({ success: true, message: "Already processed" })
    }

    // ===========================================
    // 9. Validate amount (production security)
    // ===========================================
    if (isProduction()) {
      const webhookAmount = parseFloat(order_amount)
      const orderAmount = Number(order.totalAmount)

      if (isNaN(webhookAmount) || webhookAmount <= 0) {
        console.warn(`[SePay Webhook] Invalid amount ${order_amount} for order ${order_invoice_number}`)
        return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 })
      }

      if (Math.abs(webhookAmount - orderAmount) > 1) {
        console.warn(
          `[SePay Webhook] Amount mismatch: webhook=${webhookAmount}, order=${orderAmount} for ${order_invoice_number}`
        )
        // In production, you might want to investigate rather than auto-cancel
        // For now, we log and proceed but don't confirm payment
        return NextResponse.json(
          { success: false, message: "Amount mismatch - requires manual review" },
          { status: 400 }
        )
      }
    }

    // ===========================================
    // 10. Save raw payload to PaymentTransaction
    // ===========================================
    let paymentTx = await prisma.paymentTransaction.findUnique({
      where: { orderId: order.id },
    })

    if (!paymentTx) {
      paymentTx = await prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          amount: parseFloat(order_amount) || Number(order.totalAmount),
          method: "SEPAY",
          status: "PENDING",
          requestData: parsedBody as Record<string, object>,
        },
      })
    } else {
      // Update request data with latest webhook
      await prisma.paymentTransaction.update({
        where: { id: paymentTx.id },
        data: { requestData: parsedBody as Record<string, object> },
      })
    }

    // ===========================================
    // 11. Process based on SePay status
    // ===========================================
    // SePay PG statuses: PENDING, CAPTURED, COMPLETED, SUCCESS, CANCELLED, FAILED
    // Sandbox may use CAPTURED for success
    if (
      order_status === "COMPLETED" ||
      order_status === "SUCCESS" ||
      order_status === "CAPTURED"
    ) {
      await processPaymentSuccess(order, paymentTx.id, parsedBody)
    } else if (order_status === "PENDING") {
      // User is mid-payment - no action, wait for final status
      return NextResponse.json({ success: true, message: "Pending" })
    } else if (order_status === "FAILED" || order_status === "CANCELLED") {
      await processPaymentFailed(order, paymentTx.id, parsedBody)
    } else {
      console.warn(`[SePay Webhook] Unknown order_status: ${order_status} for ${order_invoice_number}`)
    }

    const elapsed = Date.now() - startTime
    console.log(`[SePay Webhook] Processed ${order_invoice_number} (${order_status}) in ${elapsed}ms`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SePay Webhook] Error:", error)
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 })
  }
}

// ===========================================
// Helper: Payment Success
// ===========================================
async function processPaymentSuccess(
  order: Awaited<ReturnType<typeof prisma.order.findFirst>> & {
    buyer: { id: string; name: string | null }
    seller: { id: string; name: string | null }
  },
  paymentTxId: string,
  requestData: Record<string, unknown>
) {
  if (!order) return

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "SUCCESS",
        paidAt: new Date(),
        status: "PAID",
      },
    }),
    prisma.paymentTransaction.update({
      where: { id: paymentTxId },
      data: {
        status: "SUCCESS",
        responseData: { confirmed_at: new Date().toISOString() },
      },
    }),
    prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: "ORDER_PAID",
        title: "Thanh toán thành công",
        message: `Đơn hàng ${order.orderCode} đã được thanh toán thành công`,
        relatedId: order.id,
        relatedType: "ORDER",
      },
    }),
    prisma.notification.create({
      data: {
        userId: order.sellerId,
        type: "ORDER_PAID",
        title: "Có đơn hàng đã thanh toán",
        message: `Đơn hàng ${order.orderCode} đã được thanh toán. Vui lòng xác nhận và giao hàng`,
        relatedId: order.id,
        relatedType: "ORDER",
      },
    }),
  ])
}

// ===========================================
// Helper: Payment Failed
// ===========================================
async function processPaymentFailed(
  order: Awaited<ReturnType<typeof prisma.order.findFirst>> & {
    buyer: { id: string; name: string | null }
    seller: { id: string; name: string | null }
  },
  paymentTxId: string,
  requestData: Record<string, unknown>
) {
  if (!order) return

  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: order.id },
  })

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "Thanh toán thất bại hoặc bị hủy trên SePay",
      },
    }),
    prisma.paymentTransaction.update({
      where: { id: paymentTxId },
      data: {
        status: "FAILED",
        responseData: { failed_at: new Date().toISOString() },
      },
    }),
    prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: "ORDER_UPDATED",
        title: "Thanh toán thất bại",
        message: `Thanh toán đơn hàng ${order.orderCode} đã thất bại hoặc bị hủy. Đơn hàng đã bị hủy.`,
        relatedId: order.id,
        relatedType: "ORDER",
      },
    }),
    // Restore stock
    ...orderItems.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    ),
  ])
}

// ===========================================
// GET - Health check
// ===========================================
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.SEPAY_ENV || "sandbox",
    hasWebhookSecret: !!getWebhookSecret(),
  })
}
