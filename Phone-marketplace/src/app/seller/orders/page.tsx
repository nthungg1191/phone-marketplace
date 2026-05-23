"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ShoppingBag,
  Search,
  Eye,
  Check,
  X,
  Truck,
  Package,
  Clock,
  Phone,
  MapPin,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  X as XIcon,
  CheckCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface OrderItem {
  id: string
  title: string
  price: string
  image: string
  quantity: number
}

interface ReturnRequest {
  id: string
  reason: string
  description: string | null
  status: string
  createdAt: string
  sellerDecision: string | null
  sellerReason: string | null
  sellerDecidedAt: string | null
  adminDecision: string | null
  adminReason: string | null
  adminDecidedAt: string | null
}

interface Order {
  id: string
  orderCode: string
  status: string
  totalAmount: string
  shippingFee: string
  paymentMethod: string
  paymentStatus: string
  shippingAddress: string
  createdAt: string
  buyer: {
    id: string
    name: string
    email: string
    phone?: string
  }
  items: OrderItem[]
  returnRequest?: ReturnRequest | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "text-yellow-600", bg: "bg-yellow-50", icon: Clock },
  PAID: { label: "Đã thanh toán", color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle },
  CONFIRMED: { label: "Đã xác nhận", color: "text-indigo-600", bg: "bg-indigo-50", icon: Check },
  SHIPPING: { label: "Đang giao", color: "text-purple-600", bg: "bg-purple-50", icon: Truck },
  DELIVERED: { label: "Đã giao", color: "text-cyan-600", bg: "bg-cyan-50", icon: Package },
  RECEIVED: { label: "Đã nhận", color: "text-blue-600", bg: "bg-blue-50", icon: Check },
  RETURN_PERIOD: { label: "Dùng thử", color: "text-teal-600", bg: "bg-teal-50", icon: Clock },
  RETURN_PENDING: { label: "Chờ xử lý trả", color: "text-amber-600", bg: "bg-amber-50", icon: AlertCircle },
  RETURN_APPROVED: { label: "Duyệt trả", color: "text-blue-600", bg: "bg-blue-50", icon: Check },
  RETURN_REJECTED: { label: "Từ chối trả", color: "text-red-600", bg: "bg-red-50", icon: X },
  FRAUD_BUYER: { label: "Gian lận (Buyer)", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
  FRAUD_SELLER: { label: "Gian lận (Seller)", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
  COMPLETED: { label: "Hoàn thành", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  CANCELLED: { label: "Đã hủy", color: "text-red-600", bg: "bg-red-50", icon: X },
  REFUNDED: { label: "Hoàn tiền", color: "text-orange-600", bg: "bg-orange-50", icon: AlertCircle },
}

const statusFilters = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "RECEIVED", label: "Đã nhận" },
  { value: "RETURN_PERIOD", label: "Dùng thử" },
  { value: "RETURN_PENDING", label: "Chờ trả hàng" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
]

export default function SellerOrdersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [filter, setFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalOrders, setTotalOrders] = React.useState(0)

  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)

  // Return request dialog
  const [showReturnDialog, setShowReturnDialog] = React.useState(false)
  const [returnDecision, setReturnDecision] = React.useState<"APPROVED" | "REJECTED">("APPROVED")
  const [returnReason, setReturnReason] = React.useState("")
  const [returnSubmitting, setReturnSubmitting] = React.useState(false)

  const limit = 10

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/orders")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SELLER" && session?.user?.sellerStatus !== "APPROVED") {
        router.push("/seller/register")
        return
      }
    }
  }, [status, session, router])

  React.useEffect(() => {
    if (status === "authenticated") {
      fetchOrders()
    }
  }, [status, page, filter, debouncedSearch])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        role: "seller",
      })

      if (debouncedSearch) params.append("search", debouncedSearch)
      if (filter !== "all") params.append("status", filter)

      const res = await fetch(`/api/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalOrders(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch order detail with return request
  const fetchOrderDetail = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedOrder(data.order)
        setShowDetailDialog(true)
      }
    } catch (error) {
      console.error("Error fetching order detail:", error)
    }
  }

  const handleUpdateStatus = async (orderId: string, action: string) => {
    setActionLoading(true)
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
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: data.order.status })
        }
      }
    } catch (error) {
      console.error("Error updating order:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewOrder = (order: Order) => {
    fetchOrderDetail(order.id)
  }

  const handleReturnDecision = async () => {
    if (!selectedOrder?.returnRequest) return
    if (returnDecision === "REJECTED" && !returnReason.trim()) {
      alert("Vui lòng cung cấp lý do từ chối")
      return
    }

    setReturnSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/return-request/seller`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: returnDecision,
          reason: returnReason,
        }),
      })

      if (res.ok) {
        setShowReturnDialog(false)
        setShowDetailDialog(false)
        fetchOrders()
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error handling return:", error)
    } finally {
      setReturnSubmitting(false)
    }
  }

  const returnReasonLabels: Record<string, string> = {
    WRONG_ITEM: "Giao sai sản phẩm",
    DAMAGED: "Sản phẩm bị hư hỏng",
    NOT_AS_DESCRIBED: "Không đúng như mô tả",
    FAKE_PRODUCT: "Sản phẩm giả/hàng nhái",
    CHANGED_MIND: "Đổi ý",
    OTHER: "Lý do khác",
  }

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-14 w-full" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
          <p className="text-muted-foreground mt-1">
            {totalOrders} đơn hàng
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo mã đơn, tên khách hàng..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10 pr-10"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("")
                    setPage(1)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((statusFilter) => (
                <Button
                  key={statusFilter.value}
                  variant={filter === statusFilter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilter(statusFilter.value)
                    setPage(1)
                  }}
                  className="text-xs"
                >
                  {statusFilter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              icon={<ShoppingBag className="h-12 w-12" />}
              title={search || filter !== "all" ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng nào"}
              description={
                search || filter !== "all"
                  ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                  : "Đơn hàng từ khách hàng sẽ hiển thị tại đây"
              }
              action={
                search || filter !== "all" ? (
                  <Button variant="outline" onClick={() => {
                    setSearch("")
                    setFilter("all")
                    setPage(1)
                  }}>
                    Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => {
            const statusInfo = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
            const StatusIcon = statusInfo.icon

            return (
              <Card
                key={order.id}
                className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow animate-fade-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="font-semibold text-lg">{order.orderCode}</span>
                          <Badge className={cn("gap-1 border-0", statusInfo.bg, statusInfo.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                          {order.paymentMethod === "COD" ? (
                            <Badge variant="outline">COD</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                              Banking Online
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <Package className="h-4 w-4" />
                            {order.items.length} sản phẩm
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {order.buyer.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-4 w-4" />
                              {order.buyer.phone}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-muted-foreground">Khách hàng:</span>
                          <span className="font-medium">{order.buyer.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                          </p>
                          {Number(order.shippingFee) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              (Phí ship: {Number(order.shippingFee).toLocaleString("vi-VN")}đ)
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Chi tiết
                          </Button>

                          {order.status === "PAID" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, "CONFIRM")}
                              disabled={actionLoading}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              Xác nhận
                            </Button>
                          )}

                          {order.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, "SHIPPING")}
                              disabled={actionLoading}
                              className="gap-1"
                            >
                              <Truck className="h-4 w-4" />
                              Giao hàng
                            </Button>
                          )}

                          {order.status === "PAID" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, "CANCEL")}
                              disabled={actionLoading}
                              className="gap-1"
                            >
                              <X className="h-4 w-4" />
                              Hủy
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="px-6 pb-6">
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {order.items.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="w-16 h-16 bg-muted rounded-xl overflow-hidden shrink-0 relative"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items.length > 5 && (
                        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-muted-foreground">
                            +{order.items.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === p ? "default" : "outline"}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chi tiết đơn hàng
              <Badge className={cn("ml-2 border-0", selectedOrder && statusConfig[selectedOrder.status]?.bg, selectedOrder && statusConfig[selectedOrder.status]?.color)}>
                {selectedOrder?.orderCode}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                {(() => {
                  const statusInfo = statusConfig[selectedOrder.status] || statusConfig.PENDING_PAYMENT
                  const StatusIcon = statusInfo.icon
                  return (
                    <Badge className={cn("gap-1 border-0 px-3 py-1", statusInfo.bg, statusInfo.color)}>
                      <StatusIcon className="h-4 w-4" />
                      {statusInfo.label}
                    </Badge>
                  )
                })()}
                {selectedOrder.paymentMethod === "COD" ? (
                  <Badge variant="outline">Thanh toán khi nhận</Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    Đã thanh toán online
                  </Badge>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16">Tên:</span>
                    <span className="font-medium">{selectedOrder.buyer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16">Email:</span>
                    <span className="font-medium">{selectedOrder.buyer.email}</span>
                  </div>
                  {selectedOrder.buyer.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16">SĐT:</span>
                      <span className="font-medium">{selectedOrder.buyer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Địa chỉ giao hàng
                </h3>
                <p className="text-sm whitespace-pre-line">{selectedOrder.shippingAddress}</p>
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <h3 className="font-semibold">Sản phẩm ({selectedOrder.items.length})</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="w-20 h-20 bg-muted rounded-xl overflow-hidden shrink-0 relative">
                        {item.image ? (
                          <Image src={item.image} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-2">{item.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                          <p className="font-semibold text-primary">
                            {Number(item.price).toLocaleString("vi-VN")}đ
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>
                    {(
                      Number(selectedOrder.totalAmount) - Number(selectedOrder.shippingFee)
                    ).toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span>
                    {Number(selectedOrder.shippingFee) > 0
                      ? `${Number(selectedOrder.shippingFee).toLocaleString("vi-VN")}đ`
                      : "Miễn phí"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t pt-3">
                  <span>Tổng cộng</span>
                  <span className="text-primary">
                    {Number(selectedOrder.totalAmount).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              {/* Return Request Info */}
              {selectedOrder.returnRequest && (
                <div className={cn(
                  "border rounded-xl p-4",
                  selectedOrder.returnRequest.status === "PENDING" && "border-yellow-300 bg-yellow-50",
                  selectedOrder.returnRequest.status === "SELLER_APPROVED" && "border-blue-300 bg-blue-50",
                  selectedOrder.returnRequest.status === "SELLER_REJECTED" && "border-red-300 bg-red-50",
                )}>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    Yêu cầu trả hàng
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lý do:</span>
                      <span className="font-medium">
                        {returnReasonLabels[selectedOrder.returnRequest.reason] || selectedOrder.returnRequest.reason}
                      </span>
                    </div>
                    {selectedOrder.returnRequest.description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mô tả:</span>
                        <span>{selectedOrder.returnRequest.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trạng thái:</span>
                      <Badge className={
                        selectedOrder.returnRequest.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                        selectedOrder.returnRequest.status === "SELLER_APPROVED" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {selectedOrder.returnRequest.status === "PENDING" ? "Chờ duyệt" :
                         selectedOrder.returnRequest.status === "SELLER_APPROVED" ? "Đã đồng ý - Chờ Admin" :
                         selectedOrder.returnRequest.status === "SELLER_REJECTED" ? "Đã từ chối" : ""}
                      </Badge>
                    </div>
                    {selectedOrder.returnRequest.sellerDecision && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quyết định của bạn:</span>
                        <span className={selectedOrder.returnRequest.sellerDecision === "APPROVED" ? "text-green-600" : "text-red-600"}>
                          {selectedOrder.returnRequest.sellerDecision === "APPROVED" ? "Đã đồng ý" : "Đã từ chối"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Đóng
                </Button>
                {selectedOrder.status === "PAID" && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "CONFIRM")}
                    disabled={actionLoading}
                    className="gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Xác nhận đơn
                  </Button>
                )}
                {selectedOrder.status === "CONFIRMED" && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "SHIPPING")}
                    disabled={actionLoading}
                    className="gap-1"
                  >
                    <Truck className="h-4 w-4" />
                    Đang giao hàng
                  </Button>
                )}
                {selectedOrder.status === "PAID" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "CANCEL")
                      setShowDetailDialog(false)
                    }}
                    disabled={actionLoading}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" />
                    Hủy đơn
                  </Button>
                )}
                {/* Return Request Actions - Seller can approve/reject */}
                {selectedOrder.returnRequest?.status === "PENDING" && (
                  <Button
                    variant="default"
                    onClick={() => {
                      setReturnDecision("APPROVED")
                      setReturnReason("")
                      setShowReturnDialog(true)
                    }}
                    disabled={returnSubmitting}
                    className="gap-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Đồng ý trả hàng
                  </Button>
                )}
                {selectedOrder.returnRequest?.status === "PENDING" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setReturnDecision("REJECTED")
                      setReturnReason("")
                      setShowReturnDialog(true)
                    }}
                    disabled={returnSubmitting}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" />
                    Từ chối
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Decision Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {returnDecision === "APPROVED" ? "Xác nhận đồng ý trả hàng" : "Từ chối yêu cầu trả hàng"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {returnDecision === "APPROVED" ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                <p className="font-medium mb-2">Xác nhận đồng ý trả hàng?</p>
                <p>Yêu cầu trả hàng sẽ được chuyển cho Admin để xác minh và hoàn tiền cho người mua.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Lý do từ chối (bắt buộc)</Label>
                <Textarea
                  id="rejectReason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Vui lòng cung cấp lý do từ chối..."
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleReturnDecision}
              disabled={returnSubmitting || (returnDecision === "REJECTED" && !returnReason.trim())}
              className={returnDecision === "APPROVED" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {returnSubmitting ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
