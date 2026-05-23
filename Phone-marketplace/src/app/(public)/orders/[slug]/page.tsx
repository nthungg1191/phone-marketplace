"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  ShoppingBag,
  Check,
  X,
  Truck,
  Package,
  Clock,
  CreditCard,
  MapPin,
  Smartphone,
  Star,
  AlertTriangle,
  RotateCcw,
  Calendar,
  FileText,
  AlertCircle,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
  adminReviewNotes: string | null
}

interface Review {
  id: string
  productId: string
  rating: number
  accuracy: number | null
  communication: number | null
  delivery: number | null
  comment: string | null
  photos: string[]
  createdAt: string
  reviewer: { id: string; name: string; avatar: string | null }
}

interface OrderItem {
  id: string
  title: string
  price: string
  image: string
  quantity: number
  productId?: string
}

interface Order {
  id: string
  orderCode: string
  status: string
  totalAmount: string
  subtotal: string
  shippingFee: string
  createdAt: string
  confirmedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  paymentMethod: string
  paymentStatus: string
  paymentDeadline: string | null
  shippingAddress: string
  returnPeriodStartedAt: string | null
  returnPeriodEndsAt: string | null
  returnRequest: ReturnRequest | null
  buyer: { id: string; name: string; email: string; phone?: string }
  seller: { id: string; name: string; sellerRank: string }
  items: OrderItem[]
  reviews?: Review[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Đã thanh toán", color: "bg-blue-100 text-blue-800" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-indigo-100 text-indigo-800" },
  SHIPPING: { label: "Đang giao", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Đã giao", color: "bg-cyan-100 text-cyan-800" },
  RECEIVED: { label: "Đã nhận", color: "bg-blue-100 text-blue-800" },
  RETURN_PERIOD: { label: "Dùng thử", color: "bg-teal-100 text-teal-800" },
  RETURN_PENDING: { label: "Chờ xử lý trả hàng", color: "bg-amber-100 text-amber-800" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-orange-100 text-orange-800" },
  FRAUD_BUYER: { label: "Gian lận (Người mua)", color: "bg-red-100 text-red-800" },
  FRAUD_SELLER: { label: "Gian lận (Người bán)", color: "bg-red-100 text-red-800" },
}

const returnRequestStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ người bán xử lý", color: "bg-yellow-100 text-yellow-800" },
  SELLER_APPROVED: { label: "Người bán đồng ý - Chờ Admin", color: "bg-blue-100 text-blue-800" },
  SELLER_REJECTED: { label: "Người bán từ chối", color: "bg-red-100 text-red-800" },
  ADMIN_APPROVED: { label: "Admin duyệt hoàn tiền", color: "bg-green-100 text-green-800" },
  ADMIN_REJECTED: { label: "Admin từ chối", color: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Đã hủy", color: "bg-gray-100 text-gray-800" },
}

const returnReasonLabels: Record<string, string> = {
  WRONG_ITEM: "Giao sai sản phẩm",
  DAMAGED: "Sản phẩm bị hư hỏng",
  NOT_AS_DESCRIBED: "Không đúng như mô tả",
  FAKE_PRODUCT: "Sản phẩm giả/hàng nhái",
  CHANGED_MIND: "Đổi ý",
  OTHER: "Lý do khác",
}

const timelineSteps = [
  { key: "PENDING_PAYMENT", icon: Clock, label: "Chờ thanh toán" },
  { key: "PAID", icon: CreditCard, label: "Đã thanh toán" },
  { key: "CONFIRMED", icon: Check, label: "Đã xác nhận" },
  { key: "SHIPPING", icon: Truck, label: "Đang giao" },
  { key: "DELIVERED", icon: Package, label: "Đã giao" },
  { key: "RECEIVED", icon: Check, label: "Đã nhận" },
  { key: "COMPLETED", icon: Check, label: "Hoàn thành" },
]

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const orderId = params.slug as string

  const [order, setOrder] = React.useState<Order | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null)
  const [returnPeriodTimeRemaining, setReturnPeriodTimeRemaining] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false)
  const [returnReason, setReturnReason] = React.useState("")
  const [returnDescription, setReturnDescription] = React.useState("")
  const [returnSubmitting, setReturnSubmitting] = React.useState(false)

  // Review state
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [selectedProductForReview, setSelectedProductForReview] = React.useState<{ productId: string; title: string; image: string; itemId: string } | null>(null)
  const [reviewRating, setReviewRating] = React.useState(5)
  const [reviewAccuracy, setReviewAccuracy] = React.useState(5)
  const [reviewCommunication, setReviewCommunication] = React.useState(5)
  const [reviewDelivery, setReviewDelivery] = React.useState(5)
  const [reviewComment, setReviewComment] = React.useState("")
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false)

  // Fetch order data - force refresh when orderId changes (e.g., after payment)
  React.useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Không tìm thấy đơn hàng")
          setLoading(false)
          return
        }
        const data = await res.json()
        setOrder(data.order)
      } catch {
        setError("Lỗi khi tải đơn hàng")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, refreshKey])

  // Countdown timer for return period
  React.useEffect(() => {
    if (!order || !order.returnPeriodEndsAt) return
    if (["COMPLETED", "CANCELLED", "REFUNDED", "FRAUD_BUYER", "FRAUD_SELLER"].includes(order.status)) return

    const updateTimer = () => {
      const now = new Date()
      const endDate = new Date(order.returnPeriodEndsAt!)
      const diff = endDate.getTime() - now.getTime()

      if (diff <= 0) {
        setReturnPeriodTimeRemaining("Đã hết hạn")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setReturnPeriodTimeRemaining(`${days} ngày ${hours} giờ`)
      } else if (hours > 0) {
        setReturnPeriodTimeRemaining(`${hours} giờ ${minutes} phút`)
      } else {
        setReturnPeriodTimeRemaining(`${minutes} phút`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [order?.returnPeriodEndsAt, order?.status])

  // Countdown timer for payment deadline
  React.useEffect(() => {
    if (!order || order.paymentStatus !== "PENDING" || order.paymentMethod !== "SEPAY") return
    if (!order.paymentDeadline) return

    const updateTimer = () => {
      const now = new Date()
      const deadline = new Date(order.paymentDeadline!)
      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining("Đã hết hạn")
        // Refetch order to get updated status
        fetch(`/api/orders/${orderId}`)
          .then(res => res.json())
          .then(data => {
            if (data.order) setOrder(data.order)
          })
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      if (minutes > 0) {
        setTimeRemaining(`${minutes} phút ${seconds} giây`)
      } else {
        setTimeRemaining(`${seconds} giây`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [order?.paymentDeadline, order?.paymentStatus, order?.paymentMethod, orderId])

  const handleUpdateStatus = async (action: string) => {
    if (!confirm("Xác nhận thao tác này?")) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrder((prev) => prev ? { ...prev, status: data.order.status } : null)
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch {
      alert("Có lỗi xảy ra")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitReturnRequest = async () => {
    if (!returnReason) {
      alert("Vui lòng chọn lý do trả hàng")
      return
    }
    setReturnSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: returnReason,
          description: returnDescription || undefined,
          images: [],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Đã gửi yêu cầu trả hàng thành công")
        setReturnDialogOpen(false)
        setReturnReason("")
        setReturnDescription("")
        setRefreshKey(k => k + 1)
      } else {
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch {
      alert("Có lỗi xảy ra")
    } finally {
      setReturnSubmitting(false)
    }
  }

  const handleCancelReturnRequest = async () => {
    if (!confirm("Bạn có chắc muốn hủy yêu cầu trả hàng?")) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/return-request`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok) {
        alert("Đã hủy yêu cầu trả hàng")
        setRefreshKey(k => k + 1)
      } else {
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch {
      alert("Có lỗi xảy ra")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!order || !selectedProductForReview) return

    setReviewSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          productId: selectedProductForReview.productId,
          rating: reviewRating,
          accuracy: reviewAccuracy,
          communication: reviewCommunication,
          delivery: reviewDelivery,
          comment: reviewComment || undefined,
          photos: [],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Cảm ơn bạn đã đánh giá!")
        setReviewDialogOpen(false)
        setReviewComment("")
        setRefreshKey(k => k + 1)
      } else {
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch {
      alert("Có lỗi xảy ra")
    } finally {
      setReviewSubmitting(false)
    }
  }

  const isProductReviewed = (productId: string) => {
    return order?.reviews?.some(r => r.productId === productId)
  }

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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{error || "Không tìm thấy đơn hàng"}</h2>
          <Link href="/orders">
            <Button>Quay lại đơn hàng</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = statusLabels[order.status] || { label: order.status, color: "bg-gray-100" }
  const isBuyer = session?.user?.id === order.buyer.id
  const isSeller = session?.user?.id === order.seller.id

  const getCurrentStepIndex = () => {
    const statusOrder = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPING", "DELIVERED", "RECEIVED", "COMPLETED"]
    return statusOrder.indexOf(order.status)
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground">Trang chủ</Link>
            <span>/</span>
            <Link href="/orders" className="hover:text-foreground">Đơn hàng của tôi</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{order.orderCode}</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chi tiết đơn hàng</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Mã đơn: <span className="font-medium text-foreground">{order.orderCode}</span>
              </p>
            </div>
            <Badge className={`${statusInfo.color} text-sm px-3 py-1`}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            {order.status !== "CANCELLED" && order.status !== "REFUNDED" && !order.status.startsWith("FRAUD") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tiến trình đơn hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {timelineSteps.map((step, index) => {
                      const isCompleted = index < currentStepIndex
                      const isCurrent = index === currentStepIndex
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCompleted || isCurrent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1 text-center max-w-[60px]">{step.label}</span>
                          </div>
                          {index < timelineSteps.length - 1 && (
                            <div className={`w-12 h-0.5 mx-1 ${
                              index < currentStepIndex ? "bg-primary" : "bg-muted"
                            }`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Return Period Info - only show when return period is active (RETURN_PERIOD status) */}
            {order.returnPeriodStartedAt && (order.status === "RETURN_PERIOD" || order.status === "RETURN_PENDING") && (
              <Card className={order.status === "RETURN_PENDING" ? "border-amber-200 bg-amber-50/50" : "border-teal-200 bg-teal-50/50"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Thời gian dùng thử
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ngày bắt đầu:</span>
                    <span className="font-medium">
                      {new Date(order.returnPeriodStartedAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ngày kết thúc:</span>
                    <span className="font-medium">
                      {new Date(order.returnPeriodEndsAt!).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {returnPeriodTimeRemaining && order.status !== "RETURN_PENDING" && (
                    <div className={cn(
                      "flex items-center justify-between text-sm pt-2 border-t",
                      returnPeriodTimeRemaining === "Đã hết hạn"
                        ? "border-red-200 text-red-700"
                        : "border-teal-200 text-teal-700"
                    )}>
                      <span className="font-medium">Còn lại:</span>
                      <span className={cn(
                        "font-bold",
                        returnPeriodTimeRemaining === "Đã hết hạn" ? "text-red-600" : "text-teal-600"
                      )}>
                        {returnPeriodTimeRemaining}
                      </span>
                    </div>
                  )}
                  {order.status !== "RETURN_PENDING" && returnPeriodTimeRemaining !== "Đã hết hạn" && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Bạn có 14 ngày dùng thử để kiểm tra sản phẩm. Nếu không hài lòng, bạn có thể yêu cầu đổi/trả hàng.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Return Request Status */}
            {order.returnRequest && (
              <Card className={cn(
                "border-l-4",
                order.returnRequest.status === "PENDING" && "border-l-yellow-500",
                order.returnRequest.status === "SELLER_APPROVED" && "border-l-blue-500",
                order.returnRequest.status === "SELLER_REJECTED" && "border-l-red-500",
                order.returnRequest.status === "ADMIN_APPROVED" && "border-l-green-500",
                order.returnRequest.status === "ADMIN_REJECTED" && "border-l-red-500",
                order.returnRequest.status === "CANCELLED" && "border-l-gray-500"
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Yêu cầu trả hàng
                    </span>
                    <Badge className={returnRequestStatusLabels[order.returnRequest.status]?.color || "bg-gray-100"}>
                      {returnRequestStatusLabels[order.returnRequest.status]?.label || order.returnRequest.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Lý do: {returnReasonLabels[order.returnRequest.reason] || order.returnRequest.reason}</p>
                      {order.returnRequest.description && (
                        <p className="text-sm text-muted-foreground mt-1">{order.returnRequest.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Đã gửi: {new Date(order.returnRequest.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {/* Seller Decision */}
                  {order.returnRequest.sellerDecision && (
                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      order.returnRequest.sellerDecision === "APPROVED" ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"
                    )}>
                      <p className="font-medium">
                        Người bán {order.returnRequest.sellerDecision === "APPROVED" ? "đã đồng ý" : "đã từ chối"}:
                      </p>
                      {order.returnRequest.sellerReason && (
                        <p className="mt-1">{order.returnRequest.sellerReason}</p>
                      )}
                      {order.returnRequest.sellerDecidedAt && (
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(order.returnRequest.sellerDecidedAt).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Admin Decision */}
                  {order.returnRequest.adminDecision && (
                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      order.returnRequest.adminDecision === "APPROVED" ? "bg-green-50 text-green-800" :
                      order.returnRequest.adminDecision === "FRAUD_BUYER" || order.returnRequest.adminDecision === "FRAUD_SELLER"
                        ? "bg-red-50 text-red-800" : "bg-red-50 text-red-800"
                    )}>
                      <p className="font-medium">
                        Admin đã xử lý:
                        {order.returnRequest.adminDecision === "APPROVED" && " Duyệt hoàn tiền"}
                        {order.returnRequest.adminDecision === "REJECTED" && " Từ chối hoàn tiền"}
                        {order.returnRequest.adminDecision === "FRAUD_BUYER" && " Phát hiện gian lận người mua"}
                        {order.returnRequest.adminDecision === "FRAUD_SELLER" && " Phát hiện gian lận người bán"}
                      </p>
                      {order.returnRequest.adminReason && (
                        <p className="mt-1">{order.returnRequest.adminReason}</p>
                      )}
                      {order.returnRequest.adminReviewNotes && (
                        <p className="mt-1 text-xs opacity-80">Ghi chú: {order.returnRequest.adminReviewNotes}</p>
                      )}
                      {order.returnRequest.adminDecidedAt && (
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(order.returnRequest.adminDecidedAt).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cancel Return Request button (only for buyer, when PENDING) */}
                  {isBuyer && order.returnRequest.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelReturnRequest}
                      disabled={actionLoading}
                      className="w-full text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Hủy yêu cầu trả hàng
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sản phẩm ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Smartphone className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-2">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Số lượng: {item.quantity}
                      </p>
                      <p className="font-bold text-primary mt-1">
                        {Number(item.price).toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Địa chỉ giao hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.shippingAddress}</p>
                {order.buyer && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium">{order.buyer.name}</p>
                    <p className="text-sm text-muted-foreground">{order.buyer.email}</p>
                    {order.buyer.phone && (
                      <p className="text-sm text-muted-foreground">{order.buyer.phone}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Deadline Warning */}
            {isBuyer && order.status === "PENDING_PAYMENT" && order.paymentMethod === "SEPAY" && order.paymentStatus === "PENDING" && (
              <Card className={timeRemaining === "Đã hết hạn" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${timeRemaining === "Đã hết hạn" ? "text-red-600" : "text-yellow-600"}`} />
                    <div className="flex-1">
                      <p className={`font-semibold ${timeRemaining === "Đã hết hạn" ? "text-red-800" : "text-yellow-800"}`}>
                        ⏰ Thời hạn thanh toán: {timeRemaining || "Đang tính..."}
                      </p>
                      <p className={`text-sm mt-1 ${timeRemaining === "Đã hết hạn" ? "text-red-700" : "text-yellow-700"}`}>
                        {timeRemaining === "Đã hết hạn" 
                          ? "Đơn hàng đã hết hạn thanh toán. Vui lòng liên hệ hỗ trợ."
                          : "Vui lòng hoàn tất thanh toán trước khi hết thời hạn. Đơn hàng sẽ tự động bị hủy nếu không thanh toán kịp thời."}
                      </p>
                      {timeRemaining !== "Đã hết hạn" && order.paymentDeadline && (
                        <p className="text-xs text-yellow-600 mt-2">
                          Hạn thanh toán: {new Date(order.paymentDeadline).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {/* SHIPPING - Buyer confirms delivery from shipping */}
            {isBuyer && order.status === "SHIPPING" && (
              <Card>
                <CardContent className="p-4">
                  <Button
                    onClick={() => handleUpdateStatus("DELIVER")}
                    disabled={actionLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {actionLoading ? "Đang xử lý..." : "Đã nhận được hàng từ giao hàng"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Xác nhận bạn đã nhận được gói hàng. Sau đó bạn cần kiểm tra sản phẩm.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* DELIVERED - Buyer confirms product quality → Start Return Period */}
            {isBuyer && order.status === "DELIVERED" && !order.returnRequest && (
              <Card className="border-teal-200">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Bạn đã nhận được hàng từ đơn vị vận chuyển. Vui lòng kiểm tra sản phẩm và xác nhận.
                  </p>
                  <Button
                    onClick={() => handleUpdateStatus("RECEIVE")}
                    disabled={actionLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {actionLoading ? "Đang xử lý..." : "Đã kiểm tra và chấp nhận sản phẩm"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Sau khi xác nhận, 14 ngày dùng thử sẽ bắt đầu. Bạn có thể yêu cầu đổi/trả trong thời gian này.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* RETURN_PERIOD - Buyer can complete early or request return */}
            {(order.status === "RETURN_PERIOD") && isBuyer && !order.returnRequest && (
              <Card className="border-teal-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-teal-600" />
                    Yêu cầu trả hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {returnPeriodTimeRemaining && returnPeriodTimeRemaining !== "Đã hết hạn" ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Bạn vẫn còn <span className="font-medium text-teal-600">{returnPeriodTimeRemaining}</span> trong thời gian dùng thử.
                        Nếu sản phẩm không như mong đợi, bạn có thể yêu cầu đổi/trả.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateStatus("CONFIRM_SATISFIED")}
                          disabled={actionLoading}
                          className="flex-1"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Hài lòng
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setReturnDialogOpen(true)}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          size="sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Yêu cầu trả
                        </Button>
                      </div>
                      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
                        <DialogContent onClose={() => setReturnDialogOpen(false)}>
                            <DialogHeader>
                              <DialogTitle>Yêu cầu trả hàng</DialogTitle>
                              <DialogDescription>
                                Vui lòng chọn lý do trả hàng và mô tả chi tiết vấn đề bạn gặp phải.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="reason">Lý do trả hàng *</Label>
                                <Select value={returnReason} onValueChange={setReturnReason}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn lý do..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="WRONG_ITEM">Giao sai sản phẩm</SelectItem>
                                    <SelectItem value="DAMAGED">Sản phẩm bị hư hỏng</SelectItem>
                                    <SelectItem value="NOT_AS_DESCRIBED">Không đúng như mô tả</SelectItem>
                                    <SelectItem value="FAKE_PRODUCT">Sản phẩm giả/hàng nhái</SelectItem>
                                    <SelectItem value="CHANGED_MIND">Đổi ý</SelectItem>
                                    <SelectItem value="OTHER">Lý do khác</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="description">Mô tả chi tiết (tùy chọn)</Label>
                                <Textarea
                                  id="description"
                                  placeholder="Mô tả vấn đề bạn gặp phải..."
                                  value={returnDescription}
                                  onChange={(e) => setReturnDescription(e.target.value)}
                                  rows={3}
                                />
                              </div>
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-sm text-amber-800">
                                  <strong>Lưu ý:</strong> Sau khi gửi yêu cầu, người bán sẽ xem xét và phản hồi trong thời gian sớm nhất.
                                  Tiền sẽ được hoàn sau khi Admin xác nhận.
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                                Hủy
                              </Button>
                              <Button
                                onClick={handleSubmitReturnRequest}
                                disabled={returnSubmitting || !returnReason}
                              >
                                {returnSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                    <div className="text-center py-2">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-600 font-medium">Đã hết thời gian dùng thử</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bạn không thể yêu cầu trả hàng nữa.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Already has return request - show info instead of actions */}
            {(order.status === "DELIVERED" || order.status === "RETURN_PERIOD" || order.status === "RETURN_PENDING") && isBuyer && order.returnRequest && order.returnRequest.status === "PENDING" && (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Yêu cầu trả hàng đang chờ xử lý</p>
                      <p className="text-xs text-muted-foreground">
                        Người bán đang xem xét yêu cầu của bạn. Vui lòng đợi phản hồi.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Buyer completed */}
            {isBuyer && order.status === "COMPLETED" && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Đơn hàng đã hoàn thành</p>
                      <p className="text-xs text-muted-foreground">
                        Cảm ơn bạn đã mua sắm! Nếu cần hỗ trợ, vui lòng liên hệ với chúng tôi.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Section - Buyer can review completed orders */}
            {isBuyer && (order.status === "COMPLETED" || order.status === "REFUNDED") && order.items && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Đánh giá sản phẩm
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Chia sẻ trải nghiệm của bạn với sản phẩm đã mua.
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const reviewed = isProductReviewed(item.productId || "")
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                          <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden relative shrink-0">
                            {item.image ? (
                              <img src={item.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                            {reviewed ? (
                              <p className="text-xs text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Đã đánh giá
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Chưa đánh giá</p>
                            )}
                          </div>
                          {!reviewed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProductForReview({
                                  productId: item.productId || "",
                                  title: item.title,
                                  image: item.image,
                                  itemId: item.id,
                                })
                                setReviewDialogOpen(true)
                              }}
                              className="shrink-0"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Đánh giá
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {isBuyer && order.status === "PENDING_PAYMENT" && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  {order.paymentMethod === "SEPAY" && order.paymentStatus === "PENDING" && timeRemaining !== "Đã hết hạn" && (
                    <Link href={`/orders/${order.id}/payment`} className="block">
                      <Button className="w-full" size="lg">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Thanh toán ngay
                      </Button>
                    </Link>
                  )}
                  <Button
                    onClick={() => handleUpdateStatus(order.paymentMethod === "SEPAY" && order.paymentStatus === "PENDING" ? "CANCEL_PAYMENT" : "CANCEL")}
                    disabled={actionLoading}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    size="lg"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {actionLoading ? "Đang xử lý..." : order.paymentMethod === "SEPAY" && order.paymentStatus === "PENDING" ? "Hủy thanh toán" : "Hủy đơn hàng"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tổng quan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{Number(order.subtotal || 0).toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span>{Number(order.shippingFee || 0).toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Tổng cộng</span>
                  <span className="text-primary">
                    {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phương thức</span>
                  <span className="font-medium">{order.paymentMethod === "COD" ? "COD (Thanh toán khi nhận hàng)" : "Banking Online (Thanh toán qua ngân hàng)"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trạng thái</span>
                  {(() => {
                    // Logic hiển thị payment status
                    let label = ""
                    let variant: "default" | "secondary" | "outline" | "destructive" = "secondary"

                    if (order.paymentMethod === "COD") {
                      // COD: Hoàn thành = đã thanh toán
                      if (order.status === "COMPLETED" || order.status === "REFUNDED") {
                        label = "Đã thanh toán"
                        variant = "default"
                      } else if (order.status === "CANCELLED") {
                        label = "Đã hủy"
                        variant = "secondary"
                      } else {
                        label = "Chưa thanh toán"
                        variant = "outline"
                      }
                    } else {
                      // SePay
                      if (order.paymentStatus === "SUCCESS") {
                        label = "Đã thanh toán"
                        variant = "default"
                      } else if (order.paymentStatus === "FAILED") {
                        label = "Thất bại"
                        variant = "destructive"
                      } else {
                        label = "Chưa thanh toán"
                        variant = "outline"
                      }
                    }

                    return <Badge variant={variant}>{label}</Badge>
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Người bán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary">{order.seller.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{order.seller.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="capitalize">
                        {order.seller.sellerRank === "TOP_SELLER" ? "Top Seller" :
                         order.seller.sellerRank === "TRUSTED" ? "Đáng tin cậy" : "Mới"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lịch sử</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày đặt</span>
                  <span>{new Date(order.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}</span>
                </div>
                {order.confirmedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày xác nhận</span>
                    <span>{new Date(order.confirmedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
                {order.shippedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày giao</span>
                    <span>{new Date(order.shippedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày nhận</span>
                    <span>{new Date(order.deliveredAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày hoàn thành</span>
                    <span>{new Date(order.completedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày hủy</span>
                    <span>{new Date(order.cancelledAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Back Button */}
            <Link href="/orders">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại đơn hàng
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Đánh giá sản phẩm</DialogTitle>
            <DialogDescription>
              {selectedProductForReview?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Main Rating */}
            <div className="space-y-2">
              <Label>Đánh giá tổng quan *</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8",
                        star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">{reviewRating}/5</span>
              </div>
            </div>

            {/* Accuracy */}
            <div className="space-y-2">
              <Label>Mức độ chính xác</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewAccuracy(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        star <= reviewAccuracy ? "fill-amber-400 text-amber-400" : "text-gray-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Communication */}
            <div className="space-y-2">
              <Label>Chất lượng liên lạc</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewCommunication(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        star <= reviewCommunication ? "fill-amber-400 text-amber-400" : "text-gray-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div className="space-y-2">
              <Label>Giao hàng</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewDelivery(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        star <= reviewDelivery ? "fill-amber-400 text-amber-400" : "text-gray-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>Nhận xét (tùy chọn)</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitReview} disabled={reviewSubmitting}>
              {reviewSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
