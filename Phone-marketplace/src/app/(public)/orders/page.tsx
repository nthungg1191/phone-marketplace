"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ShoppingBag,
  Search,
  Eye,
  Check,
  X,
  Package,
  RefreshCw,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumb } from "@/components/shared/breadcrumb"

interface OrderItem {
  id: string
  title: string
  price: number
  image: string
  quantity: number
}

interface Order {
  id: string
  orderCode: string
  status: string
  totalAmount: number
  subtotal: number
  shippingFee: number
  createdAt: string
  buyer: { id: string; name: string; email: string }
  seller: { id: string; name: string; sellerRank: string }
  items: OrderItem[]
  paymentMethod: string
  paymentStatus: string
  paymentDeadline: string | null
}

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
  PAID: { label: "Đã thanh toán", color: "bg-blue-100 text-blue-800", icon: "💳" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-indigo-100 text-indigo-800", icon: "✓" },
  SHIPPING: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: "🚚" },
  DELIVERED: { label: "Đã giao", color: "bg-cyan-100 text-cyan-800", icon: "📦" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800", icon: "✅" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: "❌" },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-orange-100 text-orange-800", icon: "💰" },
}

export default function OrdersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("all")
  const [updating, setUpdating] = React.useState<string | null>(null)

  // Force refresh on mount to get latest data
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/orders")
      return
    }

    if (status === "authenticated") {
      setLoading(true) // Force loading state on mount
      fetchOrders()
    }
  }, [status, router])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders")
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, action: string) => {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        const data = await res.json()
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: data.order.status } : o))
        )
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error updating order:", error)
    } finally {
      setUpdating(null)
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.seller.name.toLowerCase().includes(search.toLowerCase())
    
    if (filter === "all") return matchesSearch
    return matchesSearch && o.status === filter
  })

  // Group orders by status
  const activeOrders = filteredOrders.filter(o => 
    !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)
  )
  const completedOrders = filteredOrders.filter(o => 
    ["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Đơn hàng của tôi" }]} />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Đơn hàng của tôi</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo mã đơn hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-background min-w-[160px]"
              >
                <option value="all">Tất cả</option>
                <option value="PENDING_PAYMENT">Chờ thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="SHIPPING">Đang giao</option>
                <option value="DELIVERED">Đã giao</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">
                {search || filter !== "all" ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng nào"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {search || filter !== "all" 
                  ? "Thử thay đổi từ khóa tìm kiếm" 
                  : "Hãy bắt đầu mua sắm ngay"}
              </p>
              {!search && filter === "all" && (
                <Link href="/products">
                  <Button>Khám phá sản phẩm</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Đang xử lý</h2>
                <div className="space-y-4">
                  {activeOrders.map((order) => {
                    const statusInfo = statusLabels[order.status] || { 
                      label: order.status, 
                      color: "bg-gray-100",
                      icon: "📋"
                    }
                    return (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold">{order.orderCode}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Người bán: <span className="font-medium">{order.seller.name}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.items.length} sản phẩm • {order.items.reduce((sum, i) => sum + i.quantity, 0)} cái
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-bold text-primary">
                                  {order.totalAmount.toLocaleString("vi-VN")}đ
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.paymentMethod === "COD" ? "COD" : "Sepay"}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <Link href={`/orders/${order.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Chi tiết
                                  </Button>
                                </Link>

                                {order.status === "PENDING_PAYMENT" && (
                                  <>
                                    <Link href={`/orders/${order.id}/payment`}>
                                      <Button
                                        size="sm"
                                        disabled={updating === order.id}
                                      >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        Thanh toán
                                      </Button>
                                    </Link>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleUpdateStatus(order.id, "CANCEL_PAYMENT")}
                                      disabled={updating === order.id}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Hủy
                                    </Button>
                                  </>
                                )}

                                {order.status === "SHIPPING" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(order.id, "DELIVER")}
                                    disabled={updating === order.id}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Đã nhận
                                  </Button>
                                )}

                                {order.status === "DELIVERED" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(order.id, "COMPLETE")}
                                    disabled={updating === order.id}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Xác nhận
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Order Items Preview */}
                          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                            {order.items.slice(0, 4).map((item) => (
                              <div key={item.id} className="w-14 h-14 bg-muted rounded overflow-hidden shrink-0">
                                {item.image ? (
                                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {order.items.length > 4 && (
                              <div className="w-14 h-14 bg-muted rounded flex items-center justify-center shrink-0">
                                <span className="text-sm text-muted-foreground">+{order.items.length - 4}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Đã hoàn thành / Đã hủy</h2>
                <div className="space-y-4">
                  {completedOrders.map((order) => {
                    const statusInfo = statusLabels[order.status] || { 
                      label: order.status, 
                      color: "bg-gray-100",
                      icon: "📋"
                    }
                    return (
                      <Card key={order.id} className="opacity-75">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold">{order.orderCode}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Người bán: <span className="font-medium">{order.seller.name}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.items.length} sản phẩm
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-bold text-primary">
                                  {order.totalAmount.toLocaleString("vi-VN")}đ
                                </p>
                              </div>

                              <Link href={`/orders/${order.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Chi tiết
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
