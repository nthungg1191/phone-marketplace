"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle,
  Package,
  Home,
  ShoppingBag,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Wifi,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/shared/toast"

interface Order {
  id: string
  orderCode: string
  status: string
  totalAmount: number
  paymentStatus: string
  items: {
    id: string
    title: string
    image: string
    quantity: number
  }[]
}

type VerifyResult = "success" | "pending" | "failed" | "expired" | null

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const { addToast } = useToast()

  const [order, setOrder] = React.useState<Order | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [verifyResult, setVerifyResult] = React.useState<VerifyResult>(null)
  const [verifying, setVerifying] = React.useState(false)
  const [checkCount, setCheckCount] = React.useState(0)

  // Use ref to track if already verified to prevent multiple calls
  const verifiedRef = React.useRef(false)
  const checkingRef = React.useRef(false)
  const orderIdRef = React.useRef<string | null>(null)
  orderIdRef.current = orderId

  // Auto-check payment status - only once on mount
  React.useEffect(() => {
    if (!orderId || verifiedRef.current) {
      if (!orderId) setLoading(false)
      return
    }

    const doVerify = async () => {
      if (checkingRef.current || verifiedRef.current) return
      checkingRef.current = true

      try {
        setCheckCount(prev => prev + 1)
        setLoading(true)

        const currentOrderId = orderIdRef.current
        if (!currentOrderId) return

        // First, fetch order details from database
        const orderRes = await fetch(`/api/orders/${currentOrderId}`)
        if (orderRes.ok) {
          const orderData = await orderRes.json()
          const fetchedOrder = orderData.order

          if (fetchedOrder) {
            setOrder(fetchedOrder)

            // If order is already paid in database, show success immediately
            if (fetchedOrder.paymentStatus === "SUCCESS") {
              verifiedRef.current = true
              setVerifyResult("success")
              addToast("Thanh toán đã được xác nhận!", "success")
              checkingRef.current = false
              return
            }

            // If order is failed, show failure
            if (fetchedOrder.paymentStatus === "FAILED" || fetchedOrder.status === "CANCELLED") {
              verifiedRef.current = true
              setVerifyResult("failed")
              checkingRef.current = false
              return
            }
          }
        } else {
          setError("Không tìm thấy đơn hàng")
          checkingRef.current = false
          return
        }

        // If not paid yet, verify with SePay API (only once!)
        if (!verifiedRef.current) {
          const verifyRes = await fetch(`/api/orders/${currentOrderId}/verify-payment`)

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json()

            if (verifyData.paymentStatus === "SUCCESS") {
              verifiedRef.current = true
              setVerifyResult("success")
              addToast("Thanh toán đã được xác nhận!", "success")
              // Refresh order data
              const refreshRes = await fetch(`/api/orders/${currentOrderId}`)
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json()
                setOrder(refreshData.order)
              }
            } else if (verifyData.paymentStatus === "FAILED") {
              verifiedRef.current = true
              setVerifyResult("failed")
            } else {
              // Still pending - set to pending state
              setVerifyResult("pending")
            }
          }
        }
      } catch (err) {
        console.error("Error verifying order:", err)
      } finally {
        setLoading(false)
        checkingRef.current = false
      }
    }

    // Initial verification
    doVerify()
  }, [orderId])

  const handleManualCheck = () => {
    if (verifiedRef.current || checkingRef.current || !orderId) return
    const doVerify = async () => {
      checkingRef.current = true
      setLoading(true)
      setCheckCount(prev => prev + 1)

      try {
        const orderRes = await fetch(`/api/orders/${orderId}`)
        if (orderRes.ok) {
          const orderData = await orderRes.json()
          const fetchedOrder = orderData.order
          if (fetchedOrder) {
            setOrder(fetchedOrder)
            if (fetchedOrder.paymentStatus === "SUCCESS") {
              verifiedRef.current = true
              setVerifyResult("success")
              addToast("Thanh toán đã được xác nhận!", "success")
              return
            }
            if (fetchedOrder.paymentStatus === "FAILED" || fetchedOrder.status === "CANCELLED") {
              verifiedRef.current = true
              setVerifyResult("failed")
              return
            }
          }
        }

        const verifyRes = await fetch(`/api/orders/${orderId}/verify-payment`)
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          if (verifyData.paymentStatus === "SUCCESS") {
            verifiedRef.current = true
            setVerifyResult("success")
            addToast("Thanh toán đã được xác nhận!", "success")
          } else if (verifyData.paymentStatus === "FAILED") {
            verifiedRef.current = true
            setVerifyResult("failed")
          } else {
            setVerifyResult("pending")
          }
        }
      } catch (err) {
        console.error("Error verifying order:", err)
      } finally {
        setLoading(false)
        checkingRef.current = false
      }
    }
    doVerify()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {verifying ? "Đang xác minh thanh toán..." : "Đang tải thông tin..."}
          </p>
          {verifying && (
            <p className="text-sm text-muted-foreground">
              Vui lòng đợi trong giây lát
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">Đã xảy ra lỗi</h2>
            <p className="text-muted-foreground mb-6">{error || "Không tìm thấy đơn hàng"}</p>
            <Link href="/orders">
              <Button>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Xem danh sách đơn hàng
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment successful
  if (order.paymentStatus === "SUCCESS" || verifyResult === "success") {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto">
            <Card className="border-green-200 bg-gradient-to-b from-green-50 to-white">
              <CardHeader className="text-center pb-2">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle className="h-14 w-14 text-green-600" />
                </div>
                <CardTitle className="text-3xl text-green-800">Thanh toán thành công!</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-green-700 text-lg">
                  Cảm ơn bạn đã đặt hàng tại <span className="font-semibold">HNT</span>
                </p>

                {order && (
                  <div className="bg-white rounded-lg p-4 space-y-3 border border-green-200">
                    <div className="flex justify-between items-center pb-3 border-b border-green-100">
                      <span className="text-muted-foreground">Mã đơn hàng</span>
                      <span className="font-bold text-green-700">{order.orderCode}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-green-100">
                      <span className="text-muted-foreground">Số sản phẩm</span>
                      <span className="font-medium">{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} sản phẩm</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tổng tiền</span>
                      <span className="font-bold text-xl text-green-700">
                        {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-2">Xác nhận đã được gửi</p>
                  <p>
                    Chúng tôi đã gửi email xác nhận đơn hàng đến email của bạn.
                    Bạn có thể theo dõi trạng thái đơn hàng trong mục &quot;Đơn hàng của tôi&quot;.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <Link href={`/orders/${order.id}`}>
                    <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                      <Package className="h-5 w-5 mr-2" />
                      Xem chi tiết đơn hàng
                    </Button>
                  </Link>
                  <Link href="/orders">
                    <Button size="lg" variant="outline" className="w-full">
                      <ShoppingBag className="h-5 w-5 mr-2" />
                      Danh sách đơn hàng
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button size="lg" variant="ghost" className="w-full">
                      <Home className="h-5 w-5 mr-2" />
                      Quay về trang chủ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Tiếp theo sẽ xảy ra gì?
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Người bán sẽ xác nhận đơn hàng trong vòng 24 giờ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Đơn hàng sẽ được đóng gói và chuẩn bị giao</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Bạn sẽ nhận được thông báo khi đơn hàng được giao</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Payment failed
  if (order.paymentStatus === "FAILED" || order.status === "CANCELLED" || verifyResult === "failed") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="max-w-lg mx-4 border-red-200 bg-gradient-to-b from-red-50 to-white">
          <CardHeader className="text-center pb-2">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-14 w-14 text-red-600" />
            </div>
            <CardTitle className="text-3xl text-red-800">Thanh toán không thành công</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-red-700">
              Rất tiếc, thanh toán của bạn đã không thành công.
              Đơn hàng đã bị hủy.
            </p>

            {order && (
              <div className="bg-white rounded-lg p-4 space-y-3 border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã đơn hàng</span>
                  <span className="font-bold text-red-700">{order.orderCode}</span>
                </div>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium mb-2">Bạn có thể thử lại</p>
              <p>Bạn có thể đặt hàng lại và thanh toán trong vòng 30 phút.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <Link href="/products">
                <Button size="lg" className="w-full">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Tiếp tục mua sắm
                </Button>
              </Link>
              <Link href="/orders">
                <Button size="lg" variant="outline" className="w-full">
                  Xem danh sách đơn hàng
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="ghost" className="w-full">
                  <Home className="h-5 w-5 mr-2" />
                  Quay về trang chủ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment pending - Show real-time checking status
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center">
      <Card className="max-w-lg mx-4 border-yellow-200 bg-gradient-to-b from-yellow-50 to-white">
        <CardHeader className="text-center pb-2">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-14 w-14 text-yellow-600 animate-spin" />
          </div>
          <CardTitle className="text-3xl text-yellow-800">Đang xác minh thanh toán...</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-yellow-700">
            Chúng tôi đang kiểm tra trạng thái thanh toán qua ngân hàng.
            Vui lòng đợi trong giây lát.
          </p>

          {order && (
            <div className="bg-white rounded-lg p-4 space-y-3 border border-yellow-200">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mã đơn hàng</span>
                <span className="font-bold text-yellow-700">{order.orderCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Số tiền</span>
                <span className="font-bold text-xl text-yellow-700">
                  {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
          )}

          {/* Auto-checking status */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-blue-800 mb-2">
              <Wifi className="h-4 w-4" />
              <span className="font-medium">Đang tự động kiểm tra...</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(checkCount * 10, 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Lần kiểm tra: {checkCount} / 10
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleManualCheck}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Đang kiểm tra...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                Kiểm tra lại ngay
              </>
            )}
          </Button>

          <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-medium mb-2">Bạn đã thanh toán thành công?</p>
            <p>
              Nếu đã thanh toán qua ngân hàng, hệ thống sẽ tự động cập nhật trong vài phút.
              Đơn hàng đã được tạo với trạng thái chờ thanh toán.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <Link href="/orders">
              <Button size="lg" variant="outline" className="w-full">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Xem danh sách đơn hàng
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="ghost" className="w-full">
                <Home className="h-5 w-5 mr-2" />
                Quay về trang chủ
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
