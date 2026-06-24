// SePay Payment Gateway - Official SDK
// Documentation: https://sepay.vn
// Production checklist: https://developer.sepay.vn/en/sepay-webhooks/bao-mat

import { SePayPgClient } from 'sepay-pg-node'
import { createHmac, timingSafeEqual } from 'crypto'

// ===========================================
// Environment Variables
// ===========================================
// SEPAY_ENV: 'sandbox' | 'production'
// SEPAY_MERCHANT_ID: Your merchant ID (from SePay dashboard)
// SEPAY_SECRET_KEY: Secret key for PG SDK authentication
// SEPAY_WEBHOOK_SECRET: Secret key for HMAC-SHA256 webhook signature (from webhook dashboard)
// SEPAY_WEBHOOK_SECRET_TIMESTAMP: Seconds allowed for replay protection (default: 300 = 5 min)
// SEPAY_ALLOWED_IPS: Comma-separated SePay IP addresses (optional)
// SEPAY_WEBHOOK_URL: Your public webhook URL for production

export interface SepayConfig {
  env: 'sandbox' | 'production'
  merchantId: string
  secretKey: string
}

export interface SepayPaymentRequest {
  amount: number
  orderCode: string
  description?: string
  customerId?: string
  paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER'
  successUrl?: string
  errorUrl?: string
  cancelUrl?: string
}

export interface SepayPaymentResponse {
  success: boolean
  checkoutUrl?: string
  formFields?: Record<string, string | number>
  error?: string
}

export interface SepayCallbackData {
  order_invoice_number: string
  order_amount: string
  order_status: string
  transaction_id: string
  payment_method: string
  customer_id?: string
  custom_data?: string
  error_code?: string
  error_message?: string
}

export interface SepayWebhookPayload extends SepayCallbackData {
  signature?: string
  timestamp?: number
}

// ===========================================
// Singleton client
// ===========================================
let sepayClient: SePayPgClient | null = null

export function getSepayClient(): SePayPgClient {
  if (sepayClient) return sepayClient

  const env = (process.env.SEPAY_ENV || 'sandbox') as 'sandbox' | 'production'
  const merchantId = process.env.SEPAY_MERCHANT_ID || ''
  const secretKey = process.env.SEPAY_SECRET_KEY || ''

  sepayClient = new SePayPgClient({
    env,
    merchant_id: merchantId,
    secret_key: secretKey,
  })

  return sepayClient
}

// ===========================================
// Environment helpers
// ===========================================
export function isProduction(): boolean {
  return process.env.SEPAY_ENV === 'production'
}

export function isSandbox(): boolean {
  return process.env.SEPAY_ENV !== 'production'
}

export function getWebhookSecret(): string {
  return process.env.SEPAY_WEBHOOK_SECRET || ''
}

export function getAllowedIps(): string[] {
  const ips = process.env.SEPAY_ALLOWED_IPS || ''
  return ips ? ips.split(',').map(ip => ip.trim()).filter(Boolean) : []
}

export function getTimestampTolerance(): number {
  const val = process.env.SEPAY_WEBHOOK_TIMESTAMP_TOLERANCE
  return val ? parseInt(val, 10) : 300 // default 5 minutes
}

// ===========================================
// Create Payment
// ===========================================
export async function createSepayPayment(params: SepayPaymentRequest): Promise<SepayPaymentResponse> {
  try {
    const client = getSepayClient()

    const checkoutUrl = client.checkout.initCheckoutUrl()

    const formFields = client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method: params.paymentMethod || 'BANK_TRANSFER',
      order_invoice_number: params.orderCode,
      order_amount: params.amount,
      currency: 'VND',
      order_description: params.description || `Thanh toan don hang ${params.orderCode}`,
      customer_id: params.customerId,
      success_url: params.successUrl,
      error_url: params.errorUrl,
      cancel_url: params.cancelUrl,
    })

    return {
      success: true,
      checkoutUrl,
      formFields,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi tạo thanh toán Sepay',
    }
  }
}

// ===========================================
// Webhook Signature Verification
// ===========================================

/**
 * Verify HMAC-SHA256 webhook signature per SePay docs.
 *
 * Format: {timestamp}.{raw_body} → HMAC-SHA256 → sha256={hex}
 *
 * Docs: https://developer.sepay.vn/en/sepay-webhooks/xac-thuc
 *
 * @param rawBody - raw request body as string (bytes)
 * @param signature - signature from X-SePay-Signature header (with or without sha256= prefix)
 * @param timestamp - Unix timestamp from X-SePay-Timestamp header
 */
export function verifySepayWebhook(
  rawBody: string,
  signature: string,
  timestamp: number
): boolean {
  const secretKey = getWebhookSecret()

  if (!secretKey) {
    console.warn('[SePay] SEPAY_WEBHOOK_SECRET is not configured')
    return false
  }

  if (!rawBody) {
    console.warn('[SePay] Empty raw body for signature verification')
    return false
  }

  // Anti-replay: reject timestamps outside tolerance window
  const now = Math.floor(Date.now() / 1000)
  const tolerance = getTimestampTolerance()
  if (Math.abs(now - timestamp) > tolerance) {
    console.warn(`[SePay] Webhook timestamp expired: ${timestamp}, now: ${now}, tolerance: ${tolerance}s`)
    return false
  }

  // Build signed message: {timestamp}.{raw_body}
  const message = `${timestamp}.${rawBody}`

  // Compute expected signature
  const expected = 'sha256=' + createHmac('sha256', secretKey)
    .update(message, 'utf8')
    .digest('hex')

  // Normalize: strip prefix if signature doesn't have it
  const normalizedSig = signature.startsWith('sha256=') ? signature : `sha256=${signature}`
  const normalizedExp = expected

  const sigBuf = Buffer.from(normalizedSig)
  const expBuf = Buffer.from(normalizedExp)

  if (sigBuf.length !== expBuf.length) {
    return false
  }

  return timingSafeEqual(sigBuf, expBuf)
}

/**
 * Parse webhook payload from SePay PG (Payment Gateway) callback.
 * This is the format sent by the PG SDK when a QR payment completes.
 */
export function parseSepayWebhook(body: Record<string, unknown>): SepayCallbackData | null {
  if (!body || typeof body !== 'object') return null

  const b = body as Record<string, unknown>

  if (!b.order_invoice_number || !b.order_status) {
    return null
  }

  return {
    order_invoice_number: String(b.order_invoice_number),
    order_amount: String(b.order_amount ?? '0'),
    order_status: String(b.order_status),
    transaction_id: String(b.transaction_id ?? ''),
    payment_method: String(b.payment_method ?? ''),
    customer_id: b.customer_id ? String(b.customer_id) : undefined,
    custom_data: b.custom_data ? String(b.custom_data) : undefined,
    error_code: b.error_code ? String(b.error_code) : undefined,
    error_message: b.error_message ? String(b.error_message) : undefined,
  }
}

// ===========================================
// Check & Cancel Order
// ===========================================
export async function checkSepayOrder(orderInvoiceNumber: string) {
  try {
    const client = getSepayClient()
    const response = await client.order.retrieve(orderInvoiceNumber)

    const axiosData = response.data as Record<string, unknown>
    let orderData: Record<string, unknown> | null = null

    if (axiosData && typeof axiosData === 'object' && 'data' in axiosData) {
      orderData = axiosData.data as Record<string, unknown>
    } else if (axiosData) {
      orderData = axiosData
    }

    return { success: true, data: orderData }
  } catch (error) {
    console.error(`[SePay] check order error for ${orderInvoiceNumber}:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function cancelSepayOrder(orderInvoiceNumber: string) {
  try {
    const client = getSepayClient()
    const response = await client.order.cancel(orderInvoiceNumber)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('[SePay] cancel order error:', error)
    return { success: false, error }
  }
}

// ===========================================
// IP Whitelist Helper
// ===========================================
export function isAllowedIp(clientIp: string | null): boolean {
  if (!clientIp) return false

  const allowed = getAllowedIps()
  if (allowed.length === 0) return true // No whitelist configured, allow all

  // Handle proxies (X-Forwarded-For can contain multiple IPs)
  const ip = clientIp.split(',')[0].trim()

  return allowed.includes(ip)
}

// ===========================================
// Production helpers
// ===========================================
export function getWebhookUrl(): string {
  return process.env.SEPAY_WEBHOOK_URL || ''
}

export function getMerchantId(): string {
  return process.env.SEPAY_MERCHANT_ID || ''
}

export function getSepayEnv(): 'sandbox' | 'production' {
  return (process.env.SEPAY_ENV || 'sandbox') as 'sandbox' | 'production'
}

// ===========================================
// Reconciliation helper (for cron job)
// ===========================================
export interface SePayTransaction {
  id: string
  gateway: string
  transactionDate: string
  accountNumber: string
  subAccount?: string
  code: string
  amountIn: number
  amountOut: number
  accumulated: number
  content: string
  referenceCode?: string
  transferType: 'in' | 'out'
}

/**
 * List recent transactions from SePay API.
 * Useful for reconciliation cron job.
 */
export async function listSepayTransactions(params?: {
  fromDate?: string
  toDate?: string
  accountNumber?: string
  limit?: number
}): Promise<{ success: boolean; data?: SePayTransaction[]; error?: string }> {
  try {
    const client = getSepayClient()

    // Use the transactions list API if available
    const sepayClient = client as unknown as { transaction?: { list: (params: {
      from_date?: string
      to_date?: string
      account_number?: string
      limit?: number
    }) => Promise<{ data?: unknown }> } }
    const response = await sepayClient.transaction?.list({
      from_date: params?.fromDate,
      to_date: params?.toDate,
      account_number: params?.accountNumber,
      limit: params?.limit || 100,
    })

    if (!response?.data) {
      return { success: true, data: [] }
    }

    const rawData = response.data as Record<string, unknown>
    let txList: Record<string, unknown>[] = []

    if (Array.isArray(rawData)) {
      txList = rawData as Record<string, unknown>[]
    } else if (rawData && typeof rawData === 'object' && 'data' in rawData) {
      const inner = (rawData as Record<string, unknown>).data
      txList = Array.isArray(inner) ? inner as Record<string, unknown>[] : []
    }

    const transactions: SePayTransaction[] = txList.map((tx) => ({
      id: String(tx.id ?? ''),
      gateway: String(tx.gateway ?? ''),
      transactionDate: String(tx.transactionDate ?? tx.transaction_date ?? ''),
      accountNumber: String(tx.accountNumber ?? tx.account_number ?? ''),
      subAccount: tx.subAccount ? String(tx.subAccount) : undefined,
      code: String(tx.code ?? ''),
      amountIn: Number(tx.transferType === 'in' ? tx.transferAmount ?? 0 : 0),
      amountOut: Number(tx.transferType === 'out' ? tx.transferAmount ?? 0 : 0),
      accumulated: Number(tx.accumulated ?? 0),
      content: String(tx.content ?? ''),
      referenceCode: tx.referenceCode ? String(tx.referenceCode) : undefined,
      transferType: String(tx.transferType ?? 'in') as 'in' | 'out',
    }))

    return { success: true, data: transactions }
  } catch (error) {
    console.error('[SePay] list transactions error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
