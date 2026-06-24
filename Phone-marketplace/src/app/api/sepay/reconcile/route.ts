import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { listSepayTransactions, getSepayEnv, isProduction } from "@/lib/sepay"

/**
 * SePay Reconciliation Endpoint - Production Security Checklist
 *
 * Run via cron every 15-30 minutes to catch any missed webhooks.
 * Webhooks can be lost if your endpoint is down for more than 5 hours.
 * SePay retries up to 7 times (~33 minutes), but extended outages may miss transactions.
 *
 * Docs: https://developer.sepay.vn/en/sepay-webhooks/bao-mat
 *
 * MUST be called with: Authorization: Bearer <CRON_SECRET>
 */

// GET /api/sepay/reconcile
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ===========================================
    // 1. Auth check
    // ===========================================
    const authHeader = request.headers.get("authorization") ?? ""
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      if (isProduction()) {
        return NextResponse.json(
          { error: "CRON_SECRET not configured in production" },
          { status: 500 }
        )
      }
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      if (isProduction()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const now = new Date()
    const lookbackHours = 24 // Check last 24 hours by default

    // Optional: from_date query param (ISO string)
    const url = new URL(request.url)
    const fromDateParam = url.searchParams.get("from_date")
    const fromDate = fromDateParam
      ? new Date(fromDateParam)
      : new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)
    const toDate = now.toISOString()

    console.log(`[SePay Reconcile] Running from ${fromDate.toISOString()} to ${toDate}`)

    // ===========================================
    // 2. Fetch transactions from SePay
    // ===========================================
    const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || undefined

    const result = await listSepayTransactions({
      fromDate: fromDate.toISOString(),
      toDate,
      accountNumber,
      limit: 500,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: "Failed to fetch SePay transactions", detail: result.error },
        { status: 500 }
      )
    }

    const transactions = result.data.filter((tx) => tx.transferType === "in" && tx.code)

    // ===========================================
    // 3. Find SEPAY orders in PENDING state
    // ===========================================
    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentMethod: "SEPAY",
        status: { in: ["PENDING_PAYMENT"] },
        createdAt: { gte: fromDate },
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        orderCode: true,
        totalAmount: true,
        paymentStatus: true,
        createdAt: true,
      },
    })

    // ===========================================
    // 4. Reconcile: match transactions to orders
    // ===========================================
    const results = {
      processed: 0,
      confirmed: 0,
      skipped: 0,
      errors: 0,
      details: [] as {
        orderCode: string
        action: string
        txAmount?: number
        orderAmount?: number
        match?: boolean
      }[],
    }

    for (const order of pendingOrders) {
      try {
        // Find matching transaction by order code
        const matchingTx = transactions.find(
          (tx) => tx.code === order.orderCode || tx.content?.includes(order.orderCode)
        )

        if (!matchingTx) {
          results.skipped++
          results.details.push({
            orderCode: order.orderCode,
            action: "no_matching_transaction",
            orderAmount: Number(order.totalAmount),
          })
          continue
        }

        const txAmount = matchingTx.amountIn
        const orderAmount = Number(order.totalAmount)

        // Amount must match
        if (Math.abs(txAmount - orderAmount) > 1) {
          results.errors++
          results.details.push({
            orderCode: order.orderCode,
            action: "amount_mismatch",
            txAmount,
            orderAmount,
            match: false,
          })
          console.warn(
            `[SePay Reconcile] Amount mismatch for ${order.orderCode}: tx=${txAmount}, order=${orderAmount}`
          )
          continue
        }

        // Update order to PAID
        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "SUCCESS",
              status: "PAID",
              paidAt: new Date(matchingTx.transactionDate),
            },
          }),
          prisma.notification.create({
            data: {
              type: "ORDER_PAID",
              title: "Thanh toán xác nhận (đối soát)",
              message: `Đơn hàng ${order.orderCode} đã được xác nhận thanh toán qua đối soát`,
              relatedId: order.id,
              relatedType: "ORDER",
              userId: order.buyerId,
            },
          }),
        ])

        results.confirmed++
        results.details.push({
          orderCode: order.orderCode,
          action: "confirmed",
          txAmount,
          orderAmount,
          match: true,
        })

        console.log(`[SePay Reconcile] Confirmed order ${order.orderCode} (tx: ${matchingTx.id})`)
      } catch (error) {
        results.errors++
        results.details.push({
          orderCode: order.orderCode,
          action: "error",
          orderAmount: Number(order.totalAmount),
        })
        console.error(`[SePay Reconcile] Error processing order ${order.orderCode}:`, error)
      }
    }

    results.processed = results.confirmed + results.skipped + results.errors

    const elapsed = Date.now() - startTime
    console.log(
      `[SePay Reconcile] Done in ${elapsed}ms: confirmed=${results.confirmed}, skipped=${results.skipped}, errors=${results.errors}`
    )

    return NextResponse.json({
      success: true,
      env: getSepayEnv(),
      timeRange: { from: fromDate.toISOString(), to: toDate },
      transactionsChecked: transactions.length,
      ordersChecked: pendingOrders.length,
      ...results,
      elapsedMs: elapsed,
    })
  } catch (error) {
    console.error("[SePay Reconcile] Fatal error:", error)
    return NextResponse.json({ error: "Reconciliation failed", detail: String(error) }, { status: 500 })
  }
}
