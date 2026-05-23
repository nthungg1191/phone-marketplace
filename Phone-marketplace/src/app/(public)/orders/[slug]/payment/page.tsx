"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Clock,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/shared/toast"

interface Order {
  id: string
  orderCode: string
  status: string
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  paymentDeadline: string | null
  createdAt: string
}

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: { label: "Chờ thanh toán", color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
  SUCCESS: { label: "Đã thanh toán", color: "bg-green-100 text-green-800", icon: "✅" },
  FAILED: { label: "Thanh toán thất bại", color: "bg-red-100 text-red-800", icon: "❌" },
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()

  const orderId = params.slug as string

  const [order, setOrder] = React.useState<Order | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [redirecting, setRedirecting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchOrder()
  }, [orderId])

  // Countdown timer for payment deadline
  React.useEffect(() => {
    if (!order || order.paymentStatus !== "PENDING") return
    if (!order.paymentDeadline) return

    const updateTimer = () => {
      const now = new Date()
      const deadline = new Date(order.paymentDeadline!)
      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining("Đã hết hạn")
        fetchOrder() // Refresh to get updated status
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes} phút ${seconds} giây`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [order?.paymentDeadline, order?.paymentStatus])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data.order)
      }
    } catch (error) {
      console.error("Error fetching order:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRedirectToSepay = async () => {
    setRedirecting(true)
    try {
      const res = await fetch("/api/sepay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      if (res.ok) {
        const data = await res.json()
        
        if (data.checkoutUrl && data.formFields) {
          // Tạo form để submit lên SePay
          const form = document.createElement("form")
          form.method = "POST"
          form.action = data.checkoutUrl

          Object.entries(data.formFields).forEach(([key, value]) => {
            const input = document.createElement("input")
            input.type = "hidden"
            input.name = key
            input.value = value as string
            form.appendChild(input)
          })

          document.body.appendChild(form)
          form.submit()
          return // Không làm gì thêm sau khi submit
        }
      } else {
        const data = await res.json()
        addToast(data.error || "Không thể tạo thanh toán", "error")
        setRedirecting(false)
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      addToast("Có lỗi xảy ra", "error")
      setRedirecting(false)
    }
  }

  const handleCopyOrderCode = () => {
    if (order?.orderCode) {
      navigator.clipboard.writeText(order.orderCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Không tìm thấy đơn hàng</h2>
          <Link href="/orders">
            <Button>Quay lại đơn hàng</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isPaid = order.paymentStatus === "SUCCESS"
  const isExpired = timeRemaining === "Đã hết hạn"

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/orders/${orderId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Thanh toán đơn hàng</h1>
              <p className="text-sm text-muted-foreground">
                Mã đơn: {order.orderCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã đơn hàng</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{order.orderCode}</span>
                  <button onClick={handleCopyOrderCode} className="p-1 hover:bg-muted rounded">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số tiền</span>
                <span className="font-bold text-lg text-primary">
                  {order.totalAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className={`px-2 py-1 text-xs rounded-full ${statusLabels[order.paymentStatus]?.color || "bg-gray-100"}`}>
                  {statusLabels[order.paymentStatus]?.icon} {statusLabels[order.paymentStatus]?.label || "Chờ xử lý"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Success */}
          {isPaid ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">Thanh toán thành công!</h2>
                <p className="text-green-700 mb-6">
                  Cảm ơn bạn. Đơn hàng đã được thanh toán thành công.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href={`/orders/${orderId}`}>
                    <Button>Xem chi tiết đơn hàng</Button>
                  </Link>
                  <Link href="/orders">
                    <Button variant="outline">Danh sách đơn hàng</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : isExpired ? (
            /* Expired - Show warning */
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-800 mb-2">Đã hết hạn thanh toán</h2>
                <p className="text-red-700 mb-6">
                  Thời hạn thanh toán đã kết thúc. Đơn hàng đã bị hủy tự động.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/orders">
                    <Button variant="outline">Danh sách đơn hàng</Button>
                  </Link>
                  <Link href="/products">
                    <Button>Tiếp tục mua sắm</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Pending Payment - Show redirect button */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Thanh toán chưa hoàn tất
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Countdown */}
                {timeRemaining && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-yellow-800 mb-1">Thời gian còn lại để thanh toán</p>
                    <p className="text-2xl font-bold text-yellow-700">{timeRemaining}</p>
                    {order.paymentDeadline && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Hạn đến: {new Date(order.paymentDeadline).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-2">Hướng dẫn thanh toán:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Nhấn nút &quot;Thanh toán ngay&quot; bên dưới</li>
                    <li>Bạn sẽ được chuyển đến trang thanh toán ngân hàng</li>
                    <li>Chọn ngân hàng hoặc ví điện tử để thanh toán</li>
                    <li>Sau khi thanh toán thành công, bạn sẽ được chuyển về trang xác nhận</li>
                  </ol>
                </div>

                {/* Payment Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleRedirectToSepay}
                  disabled={redirecting}
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Đang chuyển hướng...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Thanh toán ngay với Banking Online
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Bạn sẽ được chuyển đến trang thanh toán an toàn qua ngân hàng
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
