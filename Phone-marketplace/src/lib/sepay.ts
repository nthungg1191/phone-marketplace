// Sepay Payment Gateway - Official SDK
// Documentation: https://sepay.vn

import { SePayPgClient } from 'sepay-pg-node'
import { createHmac, timingSafeEqual } from 'crypto'

// Environment variables needed:
// - SEPAY_ENV: 'sandbox' | 'production' (default: sandbox)
// - SEPAY_MERCHANT_ID: Your merchant ID
// - SEPAY_SECRET_KEY: Your secret key

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
  signature?: string
  error_code?: string
  error_message?: string
}

// Singleton client instance
let sepayClient: SePayPgClient | null = null

/**
 * Get SePay client instance (singleton)
 */
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

/**
 * Create SePay checkout URL and form fields
 */
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

/**
 * Verify webhook signature from SePay
 */
export function verifySepayWebhook(payload: SepayCallbackData, expectedSignature: string): boolean {
  try {
    const secretKey = process.env.SEPAY_SECRET_KEY || ''
    if (!secretKey) {
      console.warn('SEPAY_SECRET_KEY is not configured')
      return false
    }

    const message = [
      payload.order_invoice_number,
      payload.order_amount,
      payload.order_status,
      payload.transaction_id,
      payload.payment_method,
      payload.customer_id || '',
      payload.custom_data || '',
    ].join('|')

    const signature = createHmac('sha256', secretKey)
      .update(message)
      .digest('hex')

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Sepay webhook verification error:', error)
    return false
  }
}

/**
 * Parse webhook payload from SePay
 */
export function parseSepayWebhook(body: Record<string, unknown>): SepayCallbackData | null {
  return {
    order_invoice_number: body.order_invoice_number as string,
    order_amount: body.order_amount as string,
    order_status: body.order_status as string,
    transaction_id: body.transaction_id as string,
    payment_method: body.payment_method as string,
    customer_id: body.customer_id as string | undefined,
    custom_data: body.custom_data as string | undefined,
    signature: body.signature as string | undefined,
    error_code: body.error_code as string | undefined,
    error_message: body.error_message as string | undefined,
  }
}

/**
 * Check order status with SePay
 */
export async function checkSepayOrder(orderInvoiceNumber: string) {
  try {
    const client = getSepayClient()
    const response = await client.order.retrieve(orderInvoiceNumber)

    // SDK returns Axios response with nested data structure
    // Extract actual order data from response.data.data
    const axiosData = response.data as Record<string, unknown>
    let orderData: Record<string, unknown> | null = null

    if (axiosData && typeof axiosData === 'object' && 'data' in axiosData) {
      orderData = axiosData.data as Record<string, unknown>
    } else if (axiosData) {
      orderData = axiosData
    }

    return { success: true, data: orderData }
  } catch (error) {
    console.error(`Sepay check order error for ${orderInvoiceNumber}:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Cancel SePay order (for QR payments)
 */
export async function cancelSepayOrder(orderInvoiceNumber: string) {
  try {
    const client = getSepayClient()
    const response = await client.order.cancel(orderInvoiceNumber)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Sepay cancel order error:', error)
    return { success: false, error }
  }
}

// Export client getter for advanced usage
// (already exported inline at function declaration above)
