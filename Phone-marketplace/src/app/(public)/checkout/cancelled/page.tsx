"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  XCircle,
  ShoppingCart,
  Clock,
  RefreshCw,
  Package,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CancelledOrder {
  id: string
  orderCode: string
  totalAmount: number
  items: {
    id: string
    title: string
    image: string
    quantity: number
  }[]
}

export default function CheckoutCancelledPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  const [order, setOrder] = React.useState<CancelledOrder | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (orderId) {
      fetchOrder()
    } else {
      setLoading(false)
    }
  }, [orderId])

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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Cancelled Card */}
          <Card className="border-orange-200 bg-gradient-to-b from-orange-50 to-white">
            <CardHeader className="text-center pb-2">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-14 w-14 text-orange-600" />
              </div>
              <CardTitle className="text-3xl text-orange-800">Đã hủy thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-orange-700">
                Thanh toán đã bị hủy bỏ. Đơn hàng của bạn vẫn được giữ lại 
                và bạn có thể tiếp tục thanh toán sau.
              </p>

              {order && (
                <div className="bg-white rounded-lg p-4 space-y-3 border border-orange-200">
                  <div className="flex justify-between items-center pb-3 border-b border-orange-100">
                    <span className="text-muted-foreground">Mã đơn hàng</span>
                    <span className="font-bold text-orange-700">{order.orderCode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tổng tiền</span>
                    <span className="font-bold text-xl text-orange-700">
                      {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">⏰ Thời hạn thanh toán: 30 phút</p>
                    <p>
                      Bạn có <strong>30 phút</strong> để hoàn tất thanh toán kể từ khi đặt hàng. 
                      Nếu quá thời gian này, đơn hàng sẽ tự động bị hủy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {order && (
                  <Link href={`/orders/${order.id}`}>
                    <Button size="lg" className="w-full">
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Tiếp tục thanh toán
                    </Button>
                  </Link>
                )}
                <Link href="/orders">
                  <Button size="lg" variant="outline" className="w-full">
                    <Package className="h-5 w-5 mr-2" />
                    Xem danh sách đơn hàng
                  </Button>
                </Link>
                <Link href="/products">
                  <Button size="lg" variant="ghost" className="w-full">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Tiếp tục mua sắm
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

          {/* Info Card */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Bạn cần hỗ trợ?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">!</span>
                  <span>Đơn hàng của bạn vẫn được lưu trong mục &quot;Đơn hàng của tôi&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">!</span>
                  <span>Bạn có thể thanh toán lại bất kỳ lúc nào trước khi đơn hàng bị hủy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">!</span>
                  <span>Liên hệ hỗ trợ nếu bạn gặp vấn đề khi thanh toán</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
