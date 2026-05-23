"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  Mail,
  Star,
  Package,
  TrendingUp,
  BadgeCheck,
  BadgeX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Seller {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  role: string
  sellerStatus: string
  sellerRequestAt: string | null
  sellerApprovedAt: string | null
  sellerRejectedReason: string | null
  createdAt: string
  sellerStats: {
    avgRating: number | null
    totalTransactions: number
    successRate: number | null
    isIdentityVerified: boolean | null
  } | null
  _count: {
    ordersAsSeller: number
    products: number
  }
}

interface Counts {
  NONE: number
  PENDING: number
  APPROVED: number
  REJECTED: number
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NONE: { label: "Chưa đăng ký", color: "bg-gray-100 text-gray-800", icon: <Users className="h-3 w-3" /> },
  PENDING: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
  REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
}

export default function AdminSellersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [sellers, setSellers] = React.useState<Seller[]>([])
  const [counts, setCounts] = React.useState<Counts>({ NONE: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 })
  const [loading, setLoading] = React.useState(true)

  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")

  // Moderate dialog
  const [showModerateDialog, setShowModerateDialog] = React.useState(false)
  const [selectedSeller, setSelectedSeller] = React.useState<Seller | null>(null)
  const [moderateAction, setModerateAction] = React.useState<"APPROVE" | "REJECT" | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Auth check
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/sellers")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  // Fetch sellers
  const fetchSellers = React.useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/sellers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSellers(data.sellers || [])
        setCounts(data.counts || { NONE: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 })
      }
    } catch (error) {
      console.error("Error fetching sellers:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, status, session])

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchSellers()
    }
  }, [fetchSellers, status, session])

  // Handle moderate
  const handleOpenModerate = (seller: Seller, action: "APPROVE" | "REJECT") => {
    setSelectedSeller(seller)
    setModerateAction(action)
    setRejectReason("")
    setShowModerateDialog(true)
  }

  const handleSubmitModerate = async () => {
    if (!selectedSeller || !moderateAction) return

    if (moderateAction === "REJECT" && !rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/sellers/${selectedSeller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: moderateAction,
          reason: rejectReason,
        }),
      })

      if (res.ok) {
        setShowModerateDialog(false)
        fetchSellers()
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Có lỗi xảy ra")
    } finally {
      setIsSubmitting(false)
    }
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
      <Breadcrumb items={[{ label: "Quản lý người bán" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Quản lý người bán</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Duyệt và quản lý yêu cầu đăng ký người bán
            </p>
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Chờ duyệt: {counts.PENDING}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Đã duyệt: {counts.APPROVED}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="PENDING">Chờ duyệt ({counts.PENDING})</SelectItem>
              <SelectItem value="APPROVED">Đã duyệt ({counts.APPROVED})</SelectItem>
              <SelectItem value="REJECTED">Từ chối ({counts.REJECTED})</SelectItem>
              <SelectItem value="NONE">Chưa đăng ký ({counts.NONE})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sellers List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : sellers.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không có người bán nào</p>
            </div>
          ) : (
            sellers.map((seller) => (
              <div
                key={seller.id}
                className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Seller Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {seller.avatar ? (
                          <img
                            src={seller.avatar}
                            alt={seller.name || "Avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {seller.name || "Chưa đặt tên"}
                          </h3>
                          <Badge className={statusLabels[seller.sellerStatus]?.color || "bg-gray-100"}>
                            {statusLabels[seller.sellerStatus]?.icon}
                            <span className="ml-1">{statusLabels[seller.sellerStatus]?.label}</span>
                          </Badge>
                          {seller.sellerStats?.isIdentityVerified && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Đã xác minh
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {seller.email}
                        </p>
                        {seller.phone && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ĐT: {seller.phone}
                          </p>
                        )}
                        {seller.sellerRejectedReason && (
                          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Lý do từ chối: {seller.sellerRejectedReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {seller.sellerStatus === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOpenModerate(seller, "APPROVE")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleOpenModerate(seller, "REJECT")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Đánh giá</p>
                        <p className="font-semibold">
                          {typeof seller.sellerStats?.avgRating === 'number' ? seller.sellerStats.avgRating.toFixed(1) : "N/A"} ★
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tỉ lệ thành công</p>
                        <p className="font-semibold">
                          {typeof seller.sellerStats?.successRate === 'number' ? seller.sellerStats.successRate.toFixed(0) : "N/A"}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sản phẩm</p>
                        <p className="font-semibold">{seller._count.products}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <BadgeCheck className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Giao dịch</p>
                        <p className="font-semibold">{seller._count.ordersAsSeller}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Moderate Dialog */}
      <Dialog open={showModerateDialog} onOpenChange={setShowModerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderateAction === "APPROVE" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
            </DialogTitle>
            <DialogDescription>
              {moderateAction === "APPROVE"
                ? `Bạn có chắc muốn duyệt yêu cầu đăng ký người bán của ${selectedSeller?.name || selectedSeller?.email}?`
                : `Bạn có chắc muốn từ chối yêu cầu đăng ký người bán của ${selectedSeller?.name || selectedSeller?.email}?`}
            </DialogDescription>
          </DialogHeader>

          {selectedSeller && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {selectedSeller.avatar ? (
                  <img
                    src={selectedSeller.avatar}
                    alt={selectedSeller.name || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">{selectedSeller.name || "Chưa đặt tên"}</p>
                <p className="text-sm text-muted-foreground">{selectedSeller.email}</p>
              </div>
            </div>
          )}

          {moderateAction === "REJECT" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do từ chối</Label>
              <Textarea
                id="reason"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {moderateAction === "APPROVE" && (
            <p className="text-sm text-muted-foreground">
              Sau khi duyệt, người dùng sẽ có thể đăng sản phẩm và bán hàng trên marketplace.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModerateDialog(false)}>
              Hủy
            </Button>
            <Button
              variant={moderateAction === "APPROVE" ? "default" : "destructive"}
              onClick={handleSubmitModerate}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {moderateAction === "APPROVE" ? "Duyệt" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
