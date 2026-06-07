"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"
import {
  UserCheck,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Mail,
  Phone,
  User,
  FileText,
  AlertTriangle,
  Eye,
  X,
  Check,
  RotateCcw,
  Calendar,
  ClipboardCheck,
  UserX,
  Image,
  ChevronLeft,
  ChevronRight,
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
import { Card, CardContent } from "@/components/ui/card"

// ============ TYPES ============
interface SellerApplication {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  role: string
  sellerStatus: string
  sellerRequestAt: string | null
  sellerApprovedAt: string | null
  sellerRejectedAt: string | null
  sellerRejectedReason: string | null
  sellerApprovedBy: string | null
  sellerRejectedBy: string | null
  createdAt: string
  sellerStats: {
    isIdentityVerified: boolean | null
  } | null
}

interface Counts {
  ALL: number
  PENDING: number
  APPROVED: number
  REJECTED: number
  APPROVED_TODAY: number
  REJECTED_TODAY: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============ STATUS CONFIG ============
const statusConfig: Record<string, { label: string; color: string; bgColor: string; dot: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "Chờ duyệt",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    dot: "bg-yellow-500",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  APPROVED: {
    label: "Đã duyệt",
    color: "text-green-700",
    bgColor: "bg-green-100",
    dot: "bg-green-500",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  REJECTED: {
    label: "Từ chối",
    color: "text-red-700",
    bgColor: "bg-red-100",
    dot: "bg-red-500",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

// ============ KPI CARDS ============
function KPICards({ counts }: { counts: Counts }) {
  const items = [
    {
      label: "Chờ duyệt",
      value: counts.PENDING || 0,
      icon: Clock,
      color: "amber",
      bgColor: "bg-amber-100",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
    },
    {
      label: "Đã duyệt hôm nay",
      value: counts.APPROVED_TODAY || 0,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
    {
      label: "Từ chối hôm nay",
      value: counts.REJECTED_TODAY || 0,
      icon: XCircle,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
    {
      label: "Tổng yêu cầu",
      value: counts.ALL || 0,
      icon: FileText,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className={cn("border", item.borderColor)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", item.bgColor)}>
                  <Icon className={cn("h-5 w-5", item.textColor)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============ APPLICATION CARD ============
function ApplicationCard({
  application,
  onApprove,
  onReject,
  onViewProfile,
}: {
  application: SellerApplication
  onApprove: () => void
  onReject: () => void
  onViewProfile: () => void
}) {
  const config = statusConfig[application.sellerStatus] || statusConfig.PENDING

  return (
    <Card className="border overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* User Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {application.avatar ? (
                <img src={application.avatar} alt={application.name || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{application.name || "Chưa đặt tên"}</p>
                <Badge className={config.bgColor}>
                  <span className={cn("flex items-center gap-1", config.color)}>
                    {config.icon}
                    {config.label}
                  </span>
                </Badge>
                {application.sellerStats?.isIdentityVerified && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Đã xác minh
                  </Badge>
                )}
              </div>

              <div className="mt-1.5 space-y-0.5">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {application.email}
                </p>
                {application.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {application.phone}
                  </p>
                )}
              </div>

              {/* Reject reason */}
              {application.sellerStatus === "REJECTED" && application.sellerRejectedReason && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">Lý do từ chối:</span> {application.sellerRejectedReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">
              {application.sellerRequestAt
                ? formatRelativeTime(application.sellerRequestAt)
                : formatRelativeTime(application.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {application.sellerRequestAt
                ? new Date(application.sellerRequestAt).toLocaleDateString("vi-VN")
                : new Date(application.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Button size="sm" variant="outline" onClick={onViewProfile}>
            <Eye className="h-4 w-4 mr-1.5" />
            Xem hồ sơ
          </Button>

          {application.sellerStatus === "PENDING" && (
            <>
              <Button size="sm" onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Duyệt
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={onReject}>
                <XCircle className="h-4 w-4 mr-1.5" />
                Từ chối
              </Button>
            </>
          )}

          {application.sellerStatus === "REJECTED" && (
            <Button size="sm" variant="outline" onClick={onApprove}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Duyệt lại
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ APPLICATION DETAIL DRAWER ============
function ApplicationDetailDrawer({
  application,
  open,
  onClose,
  onApprove,
  onReject,
}: {
  application: SellerApplication | null
  open: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  if (!application) return null

  const config = statusConfig[application.sellerStatus] || statusConfig.PENDING

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 transition-transform duration-300 overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hồ sơ ứng viên</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-5 space-y-6">
          {/* Status Banner */}
          <div className={cn("p-4 rounded-xl border", config.bgColor, config.color)}>
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
              <span className="font-semibold text-base">{config.label}</span>
            </div>
            {application.sellerRequestAt && (
              <p className="text-sm opacity-80">
                Ngày gửi: {new Date(application.sellerRequestAt).toLocaleDateString("vi-VN")}
              </p>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {application.avatar ? (
                <img src={application.avatar} alt={application.name || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">{application.name || "Chưa đặt tên"}</p>
              <p className="text-sm text-muted-foreground">{application.email}</p>
              {application.phone && (
                <p className="text-sm text-muted-foreground">{application.phone}</p>
              )}
            </div>
          </div>

          {/* Verification Info */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              Hồ sơ xác minh
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">CCCD</span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  application.sellerStats?.isIdentityVerified
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                )}>
                  {application.sellerStats?.isIdentityVerified ? "Đã xác minh" : "Chưa xác minh"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email</span>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Số điện thoại</span>
                </div>
                {application.phone ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <span className="text-xs text-yellow-600">Chưa xác thực</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Lịch sử
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Đăng ký tài khoản</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(application.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>

              {application.sellerRequestAt && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gửi yêu cầu Seller</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(application.sellerRequestAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              )}

              {application.sellerStatus === "APPROVED" && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Được duyệt</p>
                    {application.sellerApprovedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(application.sellerApprovedAt).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {application.sellerStatus === "REJECTED" && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bị từ chối</p>
                    {application.sellerRejectedReason && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Lý do: {application.sellerRejectedReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {application.sellerStatus === "PENDING" && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button size="sm" className="flex-1" onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Duyệt
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700" onClick={onReject}>
                <XCircle className="h-4 w-4 mr-1.5" />
                Từ chối
              </Button>
            </div>
          )}

          {application.sellerStatus === "REJECTED" && (
            <div className="pt-4 border-t">
              <Button size="sm" className="w-full" onClick={onApprove}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Duyệt lại
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============ MAIN PAGE ============
export default function AdminSellersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [applications, setApplications] = React.useState<SellerApplication[]>([])
  const [counts, setCounts] = React.useState<Counts>({ ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, APPROVED_TODAY: 0, REJECTED_TODAY: 0 })
  const [pagination, setPagination] = React.useState<Pagination | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)

  // Detail drawer
  const [detailApplication, setDetailApplication] = React.useState<SellerApplication | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Moderate dialog
  const [showModerateDialog, setShowModerateDialog] = React.useState(false)
  const [selectedApplication, setSelectedApplication] = React.useState<SellerApplication | null>(null)
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

  // Fetch applications
  const fetchApplications = React.useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (searchQuery) params.set("search", searchQuery)
      params.set("page", currentPage.toString())

      const res = await fetch(`/api/admin/sellers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setApplications(data.sellers || [])
        setPagination(data.pagination || null)
        setCounts(data.counts || {})
      }
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, currentPage, status, session])

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchApplications()
    }
  }, [fetchApplications, status, session])

  // Handlers
  const handleViewProfile = (application: SellerApplication) => {
    setDetailApplication(application)
    setDrawerOpen(true)
  }

  const handleOpenModerate = (application: SellerApplication, action: "APPROVE" | "REJECT") => {
    setSelectedApplication(application)
    setModerateAction(action)
    setRejectReason("")
    setShowModerateDialog(true)
    setDrawerOpen(false)
  }

  const handleSubmitModerate = async () => {
    if (!selectedApplication || !moderateAction) return

    if (moderateAction === "REJECT" && !rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/sellers/${selectedApplication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: moderateAction,
          reason: rejectReason,
        }),
      })

      if (res.ok) {
        setShowModerateDialog(false)
        fetchApplications()
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
      <Breadcrumb items={[{ label: "Duyệt Seller" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Duyệt Seller</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Xét duyệt yêu cầu đăng ký người bán
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email, SĐT..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-64 pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả ({counts.ALL || 0})</SelectItem>
                <SelectItem value="PENDING">Chờ duyệt ({counts.PENDING || 0})</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt ({counts.APPROVED || 0})</SelectItem>
                <SelectItem value="REJECTED">Từ chối ({counts.REJECTED || 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards counts={counts} />

        {/* Applications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không có yêu cầu nào</p>
            </div>
          ) : (
            applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onApprove={() => handleOpenModerate(application, "APPROVE")}
                onReject={() => handleOpenModerate(application, "REJECT")}
                onViewProfile={() => handleViewProfile(application)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Trang {pagination.page} / {pagination.totalPages} ({pagination.total} yêu cầu)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Application Detail Drawer */}
      <ApplicationDetailDrawer
        application={detailApplication}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApprove={() => detailApplication && handleOpenModerate(detailApplication, "APPROVE")}
        onReject={() => detailApplication && handleOpenModerate(detailApplication, "REJECT")}
      />

      {/* Moderate Dialog */}
      <Dialog open={showModerateDialog} onOpenChange={setShowModerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderateAction === "APPROVE" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
            </DialogTitle>
            <DialogDescription>
              {moderateAction === "APPROVE"
                ? `Bạn có chắc muốn cấp quyền Seller cho tài khoản này?`
                : `Vui lòng nhập lý do từ chối để ứng viên biết.`}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {selectedApplication.avatar ? (
                  <img src={selectedApplication.avatar} alt={selectedApplication.name || "Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{selectedApplication.name || "Chưa đặt tên"}</p>
                <p className="text-xs text-muted-foreground">{selectedApplication.email}</p>
              </div>
            </div>
          )}

          {moderateAction === "REJECT" && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Lý do từ chối</Label>
              <Textarea
                id="reject-reason"
                placeholder="Ví dụ: Thông tin không hợp lệ, CCCD không rõ, Trùng tài khoản..."
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
              disabled={isSubmitting || (moderateAction === "REJECT" && !rejectReason.trim())}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {moderateAction === "APPROVE" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
