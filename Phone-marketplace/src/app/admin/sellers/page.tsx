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
  Package,
  BarChart3,
  PieChart,
  TrendingUp,
  Lock,
  CreditCard,
  MapPin,
  ZoomIn,
  ExternalLink,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
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
interface Address {
  id: string
  fullName: string
  phone: string
  street: string
  wardName: string
  provinceName: string
}

interface SellerApplication {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  role: string
  sellerStatus: string
  isLocked: boolean
  lockedReason: string | null
  lockedAt: string | null
  sellerRequestAt: string | null
  sellerApprovedAt: string | null
  sellerRejectedAt: string | null
  sellerRejectedReason: string | null
  sellerApprovedBy: string | null
  sellerRejectedBy: string | null
  idCardNumber: string | null
  idCardName: string | null
  idCardFrontUrl: string | null
  idCardBackUrl: string | null
  createdAt: string
  addresses?: Address[]
  sellerStats: {
    isIdentityVerified: boolean | null
  } | null
  _count: {
    ordersAsSeller: number
    products: number
  }
}

interface Counts {
  ALL: number
  PENDING: number
  APPROVED: number
  REJECTED: number
  ACTIVE: number
  LOCKED: number
  APPROVED_TODAY: number
  REJECTED_TODAY: number
  PENDING_TODAY: number
}

interface ChartDay {
  date: string
  approved: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Product {
  id: string
  title: string
  slug: string
  price: string
  condition: string
  status: string
  images: { id: string; url: string; isPrimary: boolean }[]
  brand: { id: string; name: string; slug: string }
  category: { id: string; name: string }
  _count: { reviews: number }
  createdAt: string
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
  LOCKED: {
    label: "Bị khoá",
    color: "text-red-800",
    bgColor: "bg-red-50 border border-red-200",
    dot: "bg-red-600",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444", "#f97316"]

// ============ STATS SECTION ============
function StatsSection({ counts, chartData }: { counts: Counts; chartData: ChartDay[] }) {
  const pieData = [
    { name: "Hoạt động", value: counts.ACTIVE || 0, color: PIE_COLORS[0] },
    { name: "Chờ duyệt", value: counts.PENDING || 0, color: PIE_COLORS[1] },
    { name: "Từ chối", value: counts.REJECTED || 0, color: PIE_COLORS[2] },
    { name: "Bị khoá", value: counts.LOCKED || 0, color: PIE_COLORS[3] },
  ].filter((d) => d.value > 0)

  const kpiItems = [
    {
      label: "Tổng yêu cầu",
      value: counts.ALL || 0,
      icon: FileText,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
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
      label: "Đang hoạt động",
      value: counts.ACTIVE || 0,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
    {
      label: "Bị khoá",
      value: counts.LOCKED || 0,
      icon: Lock,
      color: "orange",
      bgColor: "bg-orange-100",
      textColor: "text-orange-700",
      borderColor: "border-orange-200",
    },
    {
      label: "Từ chối",
      value: counts.REJECTED || 0,
      icon: XCircle,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
    {
      label: "Duyệt hôm nay",
      value: counts.APPROVED_TODAY || 0,
      subLabel: `Từ chối: ${counts.REJECTED_TODAY || 0}`,
      icon: TrendingUp,
      color: "purple",
      bgColor: "bg-purple-100",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
    },
  ]

  return (
    <div className="space-y-4 mb-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiItems.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className={cn("border", item.borderColor)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", item.bgColor)}>
                    <Icon className={cn("h-4 w-4", item.textColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                    <p className="text-lg font-bold leading-tight">{item.value}</p>
                    {item.subLabel && (
                      <p className="text-[10px] text-muted-foreground leading-tight">{item.subLabel}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar Chart - 7-day growth */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Duyệt seller 7 ngày gần nhất</p>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v} yêu cầu`, "Đã duyệt"]}
                  />
                  <Bar dataKey="approved" fill="#22c55e" radius={[4, 4, 0, 0]} name="Đã duyệt" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Status distribution */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Phân bổ trạng thái</p>
            </div>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={180}>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, ""]} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="space-y-2 min-w-0">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                      <span className="text-xs font-semibold ml-auto">({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============ PRODUCTS DIALOG ============
function ProductsDialog({
  sellerId,
  sellerName,
  open,
  onClose,
}: {
  sellerId: string
  sellerName: string
  open: boolean
  onClose: () => void
}) {
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open || !sellerId) return
    setLoading(true)
    fetch(`/api/admin/sellers/${sellerId}/products`)
      .then((res) => res.ok ? res.json() : Promise.resolve({ products: [] }))
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [open, sellerId])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sản phẩm của {sellerName}</DialogTitle>
          <DialogDescription>
            Danh sách tất cả sản phẩm đã đăng ({products.length})
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có sản phẩm nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {product.images[0]?.url ? (
                    <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.brand?.name} • {product.category?.name} • {product.condition}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {Number(product.price).toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <Badge
                  className={cn(
                    product.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    product.status === "HIDDEN" ? "bg-gray-100 text-gray-600" :
                    product.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  )}
                >
                  {product.status === "ACTIVE" ? "Đang bán" :
                   product.status === "HIDDEN" ? "Đã ẩn" :
                   product.status === "PENDING" ? "Chờ duyệt" : "Từ chối"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============ APPLICATION CARD ============
function ApplicationCard({
  application,
  onApprove,
  onReject,
  onLock,
  onUnlock,
  onViewProfile,
  onViewProducts,
}: {
  application: SellerApplication
  onApprove: () => void
  onReject: () => void
  onLock: () => void
  onUnlock: () => void
  onViewProfile: () => void
  onViewProducts: () => void
}) {
  const config = application.isLocked
    ? statusConfig.LOCKED
    : (statusConfig[application.sellerStatus as keyof typeof statusConfig] || statusConfig.PENDING)

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
                {application.idCardFrontUrl && application.idCardBackUrl && (
                  <Badge className="bg-purple-100 text-purple-700">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Đã gửi CCCD
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

              {/* Locked reason */}
              {application.isLocked && application.lockedReason && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">Lý do khoá:</span> {application.lockedReason}
                  </p>
                </div>
              )}

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

          {application.sellerStatus === "APPROVED" && (
            <Button size="sm" variant="outline" onClick={onViewProducts}>
              <Package className="h-4 w-4 mr-1.5" />
              Sản phẩm ({application._count.products})
            </Button>
          )}

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

          {/* Lock/Unlock for approved sellers */}
          {application.sellerStatus === "APPROVED" && (
            <>
              {application.isLocked ? (
                <Button size="sm" variant="outline" onClick={onUnlock}>
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Mở khoá
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700" onClick={onLock}>
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Khoá
                </Button>
              )}
            </>
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
  onLock,
  onUnlock,
  onViewProducts,
}: {
  application: SellerApplication | null
  open: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onLock: () => void
  onUnlock: () => void
  onViewProducts: () => void
}) {
  if (!application) return null

  const config = application.isLocked
    ? statusConfig.LOCKED
    : (statusConfig[application.sellerStatus as keyof typeof statusConfig] || statusConfig.PENDING)

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
                  application.idCardFrontUrl && application.idCardBackUrl
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                )}>
                  {application.idCardFrontUrl && application.idCardBackUrl ? "Đã upload" : "Chưa đầy đủ"}
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

          {/* CCCD Images */}
          {(application.idCardFrontUrl || application.idCardBackUrl) && (
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Hình ảnh CCCD
              </p>

              {(application.idCardNumber || application.idCardName) && (
                <div className="mb-3 p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1.5">
                  {application.idCardNumber && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Số CCCD:</span>
                      <span className="font-mono font-semibold tracking-wide">{application.idCardNumber}</span>
                    </div>
                  )}
                  {application.idCardName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Họ tên:</span>
                      <span className="font-semibold uppercase">{application.idCardName}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {application.idCardFrontUrl && (
                  <a
                    href={application.idCardFrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-[3/2] rounded-lg overflow-hidden border-2 border-muted hover:border-primary transition-colors bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={application.idCardFrontUrl}
                      alt="CCCD mặt trước"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
                        <ZoomIn className="h-3 w-3" />
                        Phóng to
                      </div>
                    </div>
                    <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-semibold text-foreground">
                      Mặt trước
                    </div>
                  </a>
                )}
                {application.idCardBackUrl && (
                  <a
                    href={application.idCardBackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-[3/2] rounded-lg overflow-hidden border-2 border-muted hover:border-primary transition-colors bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={application.idCardBackUrl}
                      alt="CCCD mặt sau"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
                        <ZoomIn className="h-3 w-3" />
                        Phóng to
                      </div>
                    </div>
                    <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-semibold text-foreground">
                      Mặt sau
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Business Address */}
          {application.addresses && application.addresses.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Địa chỉ kinh doanh
              </p>
              {application.addresses.map((addr) => (
                <div key={addr.id} className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{addr.fullName}</span>
                    <span className="text-xs text-muted-foreground">{addr.phone}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[addr.street, addr.wardName, addr.provinceName].filter(Boolean).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}

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

          {application.sellerStatus === "APPROVED" && (
            <>
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={onViewProducts}>
                  <Package className="h-4 w-4 mr-1.5" />
                  Xem sản phẩm ({application._count.products})
                </Button>
                {application.isLocked ? (
                  <Button size="sm" className="flex-1" onClick={onUnlock}>
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Mở khoá
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" className="flex-1" onClick={onLock}>
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Khoá
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ============ LOCK/UNLOCK DIALOG ============
function LockDialog({
  open,
  onClose,
  action,
  reason,
  onReasonChange,
  onConfirm,
  isSubmitting,
}: {
  open: boolean
  onClose: () => void
  action: "LOCK" | "UNLOCK" | null
  reason: string
  onReasonChange: (v: string) => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  if (!action) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === "LOCK" ? "Khoá cửa hàng" : "Mở khoá cửa hàng"}
          </DialogTitle>
          <DialogDescription>
            {action === "LOCK"
              ? "Cửa hàng sẽ bị tạm khoá. Tất cả sản phẩm sẽ bị ẩn đi cho đến khi được mở khoá."
              : "Cửa hàng sẽ được mở khoá. Tất cả sản phẩm sẽ được hiển thị trở lại."}
          </DialogDescription>
        </DialogHeader>

        {action === "LOCK" && (
          <div className="space-y-2">
            <Label htmlFor="lock-reason">Lý do khoá</Label>
            <Textarea
              id="lock-reason"
              placeholder="Ví dụ: Vi phạm quy định, nhiều khách hàng report..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            variant={action === "LOCK" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isSubmitting || (action === "LOCK" && !reason.trim())}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {action === "LOCK" ? "Xác nhận khoá" : "Xác nhận mở khoá"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ MAIN PAGE ============
export default function AdminSellersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [applications, setApplications] = React.useState<SellerApplication[]>([])
  const [counts, setCounts] = React.useState<Counts>({ ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, ACTIVE: 0, LOCKED: 0, APPROVED_TODAY: 0, REJECTED_TODAY: 0, PENDING_TODAY: 0 })
  const [chartData, setChartData] = React.useState<ChartDay[]>([])
  const [pagination, setPagination] = React.useState<Pagination | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)

  // Detail drawer
  const [detailApplication, setDetailApplication] = React.useState<SellerApplication | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Products dialog
  const [productsDialogOpen, setProductsDialogOpen] = React.useState(false)
  const [productsSeller, setProductsSeller] = React.useState<SellerApplication | null>(null)

  // Moderate dialog
  const [showModerateDialog, setShowModerateDialog] = React.useState(false)
  const [selectedApplication, setSelectedApplication] = React.useState<SellerApplication | null>(null)
  const [moderateAction, setModerateAction] = React.useState<"APPROVE" | "REJECT" | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Lock/Unlock dialog
  const [showLockDialog, setShowLockDialog] = React.useState(false)
  const [lockAction, setLockAction] = React.useState<"LOCK" | "UNLOCK" | null>(null)
  const [lockReason, setLockReason] = React.useState("")

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
        setChartData(data.chartData || [])
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

  const handleViewProducts = (application: SellerApplication) => {
    setProductsSeller(application)
    setProductsDialogOpen(true)
    setDrawerOpen(false)
  }

  const handleOpenModerate = (application: SellerApplication, action: "APPROVE" | "REJECT") => {
    setSelectedApplication(application)
    setModerateAction(action)
    setRejectReason("")
    setShowModerateDialog(true)
    setDrawerOpen(false)
  }

  const handleOpenLock = (application: SellerApplication, action: "LOCK" | "UNLOCK") => {
    setSelectedApplication(application)
    setLockAction(action)
    setLockReason("")
    setShowLockDialog(true)
    setDrawerOpen(false)
  }

  const handleSubmitLock = async () => {
    if (!selectedApplication || !lockAction) return

    if (lockAction === "LOCK" && !lockReason.trim()) {
      alert("Vui lòng nhập lý do khoá")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/sellers/${selectedApplication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lockAction,
          reason: lockReason,
        }),
      })

      if (res.ok) {
        setShowLockDialog(false)
        fetchApplications()
        // Cap nhat trang thai khoa cua seller trong drawer
        if (detailApplication && lockAction) {
          setDetailApplication({
            ...detailApplication,
            isLocked: lockAction === "LOCK",
            lockedReason: lockAction === "LOCK" ? lockReason : null,
          })
        }
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
        // Cap nhat trang thai cua seller trong drawer
        if (detailApplication && moderateAction) {
          setDetailApplication({
            ...detailApplication,
            sellerStatus: moderateAction === "APPROVE" ? "APPROVED" : "REJECTED",
            sellerRejectedReason: moderateAction === "REJECT" ? rejectReason : detailApplication.sellerRejectedReason,
          })
        }
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

        {/* Stats & Charts */}
        <StatsSection counts={counts} chartData={chartData} />

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
                onLock={() => handleOpenLock(application, "LOCK")}
                onUnlock={() => handleOpenLock(application, "UNLOCK")}
                onViewProfile={() => handleViewProfile(application)}
                onViewProducts={() => handleViewProducts(application)}
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
        onLock={() => detailApplication && handleOpenLock(detailApplication, "LOCK")}
        onUnlock={() => detailApplication && handleOpenLock(detailApplication, "UNLOCK")}
        onViewProducts={() => detailApplication && handleViewProducts(detailApplication)}
      />

      {/* Products Dialog */}
      <ProductsDialog
        sellerId={productsSeller?.id || ""}
        sellerName={productsSeller?.name || ""}
        open={productsDialogOpen}
        onClose={() => setProductsDialogOpen(false)}
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

      {/* Lock Dialog */}
      <LockDialog
        open={showLockDialog}
        onClose={() => setShowLockDialog(false)}
        action={lockAction}
        reason={lockReason}
        onReasonChange={setLockReason}
        onConfirm={handleSubmitLock}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
