"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import {
  ShoppingCart,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Package,
  X,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface OrderItem {
  id: string
  title: string
  price: number
  quantity: number
  image: string
  product: { id: string; title: string; slug: string }
}

interface ReturnRequest {
  id: string
  reason: string
  description: string | null
  status: string
  createdAt: string
  requestedById: string
  sellerDecision: string | null
  sellerReason: string | null
  sellerDecidedAt: string | null
  adminDecision: string | null
  adminReason: string | null
  adminDecidedAt: string | null
}

interface Payment {
  id: string
  method: string
  status: string
  amount: number
  transactionId: string | null
  paidAt: string | null
}

interface Order {
  id: string
  orderCode: string
  status: string
  paymentMethod: string
  paymentStatus: string
  shippingAddress: string
  subtotal: number
  shippingFee: number
  totalAmount: number
  createdAt: string
  buyer: {
    id: string
    name: string | null
    email: string
    phone: string | null
    avatar: string | null
  }
  seller: {
    id: string
    name: string | null
    avatar: string | null
    sellerStats: { avgRating: number | null } | null
  }
  items: OrderItem[]
  returnRequest?: ReturnRequest | null
  payment?: Payment | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  PAID: { label: "Đã thanh toán", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-3 w-3" /> },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-indigo-100 text-indigo-800", icon: <CheckCircle className="h-3 w-3" /> },
  SHIPPING: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: <Truck className="h-3 w-3" /> },
  DELIVERED: { label: "Đã giao", color: "bg-cyan-100 text-cyan-800", icon: <Package className="h-3 w-3" /> },
  RECEIVED: { label: "Đã nhận", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-3 w-3" /> },
  RETURN_PERIOD: { label: "Dùng thử", color: "bg-teal-100 text-teal-800", icon: <Clock className="h-3 w-3" /> },
  RETURN_PENDING: { label: "Chờ xử lý trả", color: "bg-amber-100 text-amber-800", icon: <Info className="h-3 w-3" /> },
  RETURN_APPROVED: { label: "Duyệt trả", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-3 w-3" /> },
  RETURN_REJECTED: { label: "Từ chối trả", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  FRAUD_BUYER: { label: "Gian lận Buyer", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  FRAUD_SELLER: { label: "Gian lận Seller", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  REFUNDED: { label: "Hoàn tiền", color: "bg-orange-100 text-orange-800", icon: <Info className="h-3 w-3" /> },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chưa thanh toán", color: "bg-yellow-100 text-yellow-800" },
  SUCCESS: { label: "Đã thanh toán", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Thất bại", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-gray-100 text-gray-800" },
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pagination, setPagination] = React.useState({ page: 1, totalPages: 1, total: 0 })
  const [counts, setCounts] = React.useState<Record<string, number>>({})

  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [userIdFilter, setUserIdFilter] = React.useState<string | null>(null)
  const [sellerIdFilter, setSellerIdFilter] = React.useState<string | null>(null)

  // Sync userId/sellerId from URL params (set when navigating from admin/users)
  React.useEffect(() => {
    if (!searchParams) return
    const uid = searchParams.get("userId")
    const sid = searchParams.get("sellerId")
    setUserIdFilter(uid)
    setSellerIdFilter(sid)
  }, [searchParams])

  // Detail dialog
  const [showDetail, setShowDetail] = React.useState(false)
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null)

  // Update status dialog
  const [showStatusDialog, setShowStatusDialog] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Return request decision
  const [showReturnDialog, setShowReturnDialog] = React.useState(false)
  const [returnDecision, setReturnDecision] = React.useState<"APPROVED" | "REJECTED" | "FRAUD_BUYER" | "FRAUD_SELLER">("APPROVED")
  const [returnReason, setReturnReason] = React.useState("")
  const [returnReviewNotes, setReturnReviewNotes] = React.useState("")
  const [returnSubmitting, setReturnSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/orders")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  const fetchOrders = React.useCallback(async (page = 1) => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (searchQuery) params.set("search", searchQuery)
      const uid = searchParams?.get("userId")
      const sid = searchParams?.get("sellerId")
      if (uid) params.set("userId", uid)
      if (sid) params.set("sellerId", sid)

      const res = await fetch(`/api/admin/orders?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total,
        })
        setCounts(data.counts?.byStatus || {})
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, searchParams, status, session])

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchOrders()
    }
  }, [fetchOrders, status, session])

  const handleViewDetail = async (order: Order) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedOrder(data.order)
        setShowDetail(true)
      }
    } catch (error) {
      console.error("Error fetching order detail:", error)
    }
  }

  const handleUpdateStatus = () => {
    if (!selectedOrder || !newStatus) return

    setIsSubmitting(true)
    
    fetch(`/api/admin/orders/${selectedOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error)
        } else {
          setShowStatusDialog(false)
          setShowDetail(false)
          fetchOrders()
        }
      })
      .catch(console.error)
      .finally(() => setIsSubmitting(false))
  }

  const handleReturnDecision = async () => {
    if (!selectedOrder?.returnRequest) return

    setReturnSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/return-request/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: returnDecision,
          reason: returnReason,
          reviewNotes: returnReviewNotes,
        }),
      })

      if (res.ok) {
        setShowReturnDialog(false)
        setShowDetail(false)
        fetchOrders()
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error handling return decision:", error)
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

  const openReturnDialog = (decision: typeof returnDecision) => {
    setReturnDecision(decision)
    setReturnReason("")
    setReturnReviewNotes("")
    setShowReturnDialog(true)
  }

  const openStatusDialog = (order: Order, currentStatus: string) => {
    setSelectedOrder(order)
    setNewStatus("")
    setShowStatusDialog(true)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Quản lý đơn hàng" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Xem và cập nhật trạng thái đơn hàng
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            {Object.entries(statusConfig).slice(0, 4).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
                <span className={config.color + " p-1 rounded"}>{config.icon}</span>
                <span className="text-sm font-medium">{counts[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã đơ, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="PENDING_PAYMENT">Chờ thanh toán</SelectItem>
              <SelectItem value="PAID">Đã thanh toán</SelectItem>
              <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
              <SelectItem value="SHIPPING">Đang giao</SelectItem>
              <SelectItem value="DELIVERED">Đã giao</SelectItem>
              <SelectItem value="RECEIVED">Đã nhận</SelectItem>
              <SelectItem value="RETURN_PERIOD">Dùng thử</SelectItem>
              <SelectItem value="RETURN_PENDING">Chờ xử lý trả</SelectItem>
              <SelectItem value="RETURN_APPROVED">Chờ hoàn tiền</SelectItem>
              <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
              <SelectItem value="CANCELLED">Đã hủy</SelectItem>
              <SelectItem value="REFUNDED">Hoàn tiền</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Mã đơ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tổng tiền</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Thanh toán</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Không có đơn hàng nào
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium">{order.orderCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{order.buyer.name || "Chưa có tên"}</p>
                        <p className="text-xs text-muted-foreground">{order.buyer.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-primary">
                          {formatPrice(order.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge className={statusConfig[order.status]?.color || "bg-gray-100"}>
                            {statusConfig[order.status]?.icon}
                            <span className="ml-1">{statusConfig[order.status]?.label}</span>
                          </Badge>
                          {order.returnRequest && order.returnRequest.status !== "ADMIN_REJECTED" && order.returnRequest.status !== "ADMIN_APPROVED" && (
                            <Badge className={order.returnRequest.status === "SELLER_APPROVED" ? "bg-blue-100 text-blue-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
                              <Info className="h-2 w-2 mr-1" />
                              {order.returnRequest.status === "PENDING" ? "Chờ Seller" : "Chờ Admin"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {/* COD orders show as paid when completed */}
                        {order.paymentMethod === "COD" && order.status === "COMPLETED" ? (
                          <Badge className="bg-green-100 text-green-800">
                            Đã thanh toán
                          </Badge>
                        ) : (
                          <Badge className={paymentStatusConfig[order.paymentStatus]?.color || "bg-gray-100"}>
                            {paymentStatusConfig[order.paymentStatus]?.label}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {![
                            "COMPLETED", "CANCELLED", "REFUNDED",
                            "FRAUD_BUYER", "FRAUD_SELLER",
                            "RETURN_APPROVED", "RETURN_REJECTED"
                          ].includes(order.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStatusDialog(order, order.status)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Trang {pagination.page} / {pagination.totalPages} ({pagination.total} đơn)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchOrders(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchOrders(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng {selectedOrder?.orderCode}</DialogTitle>
            <DialogDescription>
              Ngày tạo: {selectedOrder && formatDate(selectedOrder.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Trạng thái</p>
                  <Badge className={statusConfig[selectedOrder.status]?.color}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Thanh toán</p>
                  {selectedOrder.paymentMethod === "COD" && selectedOrder.status === "COMPLETED" ? (
                    <Badge className="bg-green-100 text-green-800">
                      Đã thanh toán (COD)
                    </Badge>
                  ) : (
                    <Badge className={paymentStatusConfig[selectedOrder.paymentStatus]?.color}>
                      {selectedOrder.paymentMethod === "COD" ? "COD - " : "Banking Online - "}
                      {paymentStatusConfig[selectedOrder.paymentStatus]?.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Buyer & Seller */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Người mua</p>
                  <p className="font-medium">{selectedOrder.buyer.name || "Chưa có tên"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.buyer.email}</p>
                  {selectedOrder.buyer.phone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.buyer.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Người bán</p>
                  <p className="font-medium">{selectedOrder.seller.name || "Chưa có tên"}</p>
                  {selectedOrder.seller.sellerStats?.avgRating != null && (
                    <p className="text-sm text-muted-foreground">
                      Rating: {Number(selectedOrder.seller.sellerStats.avgRating).toFixed(1)} ★
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Địa chỉ giao hàng</p>
                <p className="p-3 bg-muted rounded-lg text-sm">{selectedOrder.shippingAddress}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Sản phẩm</p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span>Tạm tính:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Phí ship:</span>
                  <span>{formatPrice(selectedOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">{formatPrice(selectedOrder.totalAmount)}</span>
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
                  <h4 className="font-semibold mb-3">Yêu cầu trả hàng</h4>
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
                      <span className="text-muted-foreground">Trạng thái yêu cầu:</span>
                      <Badge className={
                        selectedOrder.returnRequest.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                        selectedOrder.returnRequest.status === "SELLER_APPROVED" ? "bg-blue-100 text-blue-800" :
                        selectedOrder.returnRequest.status === "SELLER_REJECTED" ? "bg-red-100 text-red-800" :
                        selectedOrder.returnRequest.status === "ADMIN_APPROVED" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {selectedOrder.returnRequest.status === "PENDING" ? "Chờ Seller duyệt" :
                         selectedOrder.returnRequest.status === "SELLER_APPROVED" ? "Seller đồng ý - Chờ Admin" :
                         selectedOrder.returnRequest.status === "SELLER_REJECTED" ? "Seller từ chối" :
                         selectedOrder.returnRequest.status === "ADMIN_APPROVED" ? "Admin đã duyệt" :
                         selectedOrder.returnRequest.status}
                      </Badge>
                    </div>
                    {selectedOrder.returnRequest.sellerDecision && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quyết định Seller:</span>
                        <span className={selectedOrder.returnRequest.sellerDecision === "APPROVED" ? "text-green-600" : "text-red-600"}>
                          {selectedOrder.returnRequest.sellerDecision === "APPROVED" ? "Đã đồng ý" : "Đã từ chối"}
                          {selectedOrder.returnRequest.sellerReason && `: ${selectedOrder.returnRequest.sellerReason}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {![
                "COMPLETED", "CANCELLED", "REFUNDED",
                "FRAUD_BUYER", "FRAUD_SELLER",
              ].includes(selectedOrder?.status || "") && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDetail(false)}>
                    Đóng
                  </Button>
                  {/* Return Request Actions - Admin can approve refund */}
                  {selectedOrder.returnRequest?.status === "SELLER_APPROVED" && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => openReturnDialog("FRAUD_BUYER")}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Gian lận Buyer
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => openReturnDialog("FRAUD_SELLER")}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Gian lận Seller
                      </Button>
                      <Button
                        onClick={() => openReturnDialog("REJECTED")}
                        variant="outline"
                        className="gap-1 text-orange-600 border-orange-200"
                      >
                        Từ chối hoàn
                      </Button>
                      <Button
                        onClick={() => openReturnDialog("APPROVED")}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Duyệt hoàn tiền
                      </Button>
                    </>
                  )}
                  {/* Normal status update */}
                  {(!selectedOrder.returnRequest || selectedOrder.returnRequest?.status !== "SELLER_APPROVED") && (
                    <Button onClick={() => {
                      setShowDetail(false)
                      openStatusDialog(selectedOrder, selectedOrder.status)
                    }}>
                      Cập nhật trạng thái
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
            <DialogDescription>
              Mã đơ: {selectedOrder?.orderCode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Trạng thái mới</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedOrder?.status === "PENDING_PAYMENT" && (
                    <>
                      <SelectItem value="PAID">Đã thanh toán</SelectItem>
                      <SelectItem value="CANCELLED">Hủy đơn</SelectItem>
                    </>
                  )}
                  {selectedOrder?.status === "PAID" && (
                    <>
                      <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                      <SelectItem value="CANCELLED">Hủy đơn</SelectItem>
                    </>
                  )}
                  {selectedOrder?.status === "CONFIRMED" && (
                    <>
                      <SelectItem value="SHIPPING">Đang giao hàng</SelectItem>
                      <SelectItem value="CANCELLED">Hủy đơn</SelectItem>
                    </>
                  )}
                  {selectedOrder?.status === "SHIPPING" && (
                    <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                  )}
                  {selectedOrder?.status === "DELIVERED" && (
                    <SelectItem value="RECEIVED">Đã nhận hàng</SelectItem>
                  )}
                  {selectedOrder?.status === "RETURN_PENDING" && (
                    <>
                      <SelectItem value="FRAUD_BUYER">Gian lận Buyer</SelectItem>
                      <SelectItem value="FRAUD_SELLER">Gian lận Seller</SelectItem>
                      <SelectItem value="REFUNDED">Hoàn tiền</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {newStatus === "CANCELLED" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <X className="h-4 w-4 inline mr-2" />
                Hủy đơn sẽ khôi phục lại sản phẩm về trạng thái có sẵn bán.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateStatus} disabled={!newStatus || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Request Decision Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {returnDecision === "APPROVED" ? "Duyệt hoàn tiền" :
               returnDecision === "REJECTED" ? "Từ chối hoàn tiền" :
               returnDecision === "FRAUD_BUYER" ? "Gian lận phía Buyer" :
               "Gian lận phía Seller"}
            </DialogTitle>
            <DialogDescription>
              Mã đơ: {selectedOrder?.orderCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {returnDecision === "APPROVED" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                <p className="font-medium mb-1">Xác nhận hoàn tiền?</p>
                <p>Tiền sẽ được hoàn cho người mua. Sản phẩm sẽ được hoàn vào kho của người bán.</p>
                <p className="mt-2 font-medium">Số tiền hoàn: {selectedOrder && formatPrice(selectedOrder.totalAmount)}</p>
              </div>
            )}
            {returnDecision === "REJECTED" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <p>Từ chối hoàn tiền. Đơn hàng sẽ được xác nhận hoàn thành.</p>
              </div>
            )}
            {returnDecision === "FRAUD_BUYER" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <p className="font-medium mb-1">Phát hiện gian lận phía Buyer</p>
                <p>Buyer sẽ bị ghi nhận vi phạm. Tiền được giữ lại cho Seller.</p>
              </div>
            )}
            {returnDecision === "FRAUD_SELLER" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <p className="font-medium mb-1">Phát hiện gian lận phía Seller</p>
                <p>Seller sẽ bị ghi nhận vi phạm. Tiền được hoàn cho Buyer.</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do / Ghi chú</label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Nhập lý do quyết định..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ghi chú xác minh (nội bộ)</label>
              <Textarea
                value={returnReviewNotes}
                onChange={(e) => setReturnReviewNotes(e.target.value)}
                placeholder="Ghi chú về quá trình xác minh..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleReturnDecision}
              disabled={returnSubmitting}
              className={returnDecision === "APPROVED" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {returnSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
