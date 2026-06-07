"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Search,
  Lock,
  Unlock,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Mail,
  MoreVertical,
  Eye,
  ShoppingBag,
  Package,
  Star,
  Clock,
  AlertTriangle,
  FileText,
  ArrowUpDown,
  ChevronDown,
  X,
  UserCog,
  Bell,
  Download,
  ShoppingCart,
  Circle,
} from "lucide-react"

// ============ TYPES ============
interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  role: string
  isVerified: boolean
  isLocked: boolean
  createdAt: string
  sellerStatus: string | null
  sellerStats: {
    avgRating: number | null
    totalTransactions: number
    successRate: number | null
  } | null
  _count: {
    products: number
    ordersAsBuyer: number
    ordersAsSeller: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Counts {
  ALL: number
  BUYER: number
  SELLER: number
  ADMIN: number
  LOCKED: number
  UNVERIFIED: number
}

// ============ STATUS CONFIG ============
const statusConfig: Record<string, {
  label: string
  color: string
  bgColor: string
  dot: string
}> = {
  active: {
    label: "Hoạt động",
    color: "text-green-700",
    bgColor: "bg-green-100",
    dot: "bg-green-500",
  },
  warning: {
    label: "Cảnh báo",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    dot: "bg-yellow-500",
  },
  locked: {
    label: "Bị khóa",
    color: "text-red-700",
    bgColor: "bg-red-100",
    dot: "bg-red-500",
  },
  unverified: {
    label: "Chưa xác thực",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    dot: "bg-blue-500",
  },
}

function getUserStatus(user: User): string {
  if (user.isLocked) return "locked"
  if (!user.isVerified) return "unverified"
  if (user.sellerStatus === "REJECTED") return "warning"
  return "active"
}

const roleLabels: Record<string, { label: string; color: string }> = {
  BUYER: { label: "Người mua", color: "bg-blue-100 text-blue-800" },
  SELLER: { label: "Người bán", color: "bg-green-100 text-green-800" },
  ADMIN: { label: "Quản trị", color: "bg-purple-100 text-purple-800" },
}

// ============ KPI CARDS ============
function KPICards({ counts }: { counts: Counts }) {
  const items = [
    {
      label: "Tổng người dùng",
      value: counts.ALL || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Người mua",
      value: counts.BUYER || 0,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Người bán",
      value: counts.SELLER || 0,
      icon: UserCheck,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      label: "Đã khóa",
      value: counts.LOCKED || 0,
      icon: Lock,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", item.bgColor)}>
                  <Icon className={cn("h-5 w-5", item.color)} />
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

// ============ METRIC BADGE ============
function MetricBadge({ icon: Icon, value, color, label }: {
  icon: React.ComponentType<{ className?: string }>
  value: number | string
  color?: string
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]" title={label}>
      <Icon className={cn("h-3 w-3", color || "text-muted-foreground")} />
      <span className={cn("font-semibold", color || "text-foreground")}>{value}</span>
    </div>
  )
}

// ============ USER STATS BADGES ============
function UserStatsBadges({ user }: { user: User }) {
  if (user.role === "SELLER") {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <MetricBadge icon={Package} value={user._count.products} label="Sản phẩm" />
        <MetricBadge icon={ShoppingBag} value={user._count.ordersAsSeller} color="text-green-600" label="Đơn bán" />
        <MetricBadge
          icon={Star}
          value={user.sellerStats?.avgRating != null ? `${Number(user.sellerStats.avgRating).toFixed(1)}★` : "—"}
          color="text-yellow-600"
          label="Đánh giá"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <MetricBadge icon={ShoppingCart} value={user._count.ordersAsBuyer} color="text-blue-600" label="Đơn mua" />
      <MetricBadge icon={Star} value={user._count.products} label="Sản phẩm" />
    </div>
  )
}

// ============ STATUS BADGE ============
function StatusBadge({ user }: { user: User }) {
  const status = getUserStatus(user)
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-2 w-2 rounded-full", config.dot)} />
      <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
    </div>
  )
}

// ============ USER DETAIL DRAWER ============
function UserDetailDrawer({
  user,
  open,
  onClose,
}: {
  user: User | null
  open: boolean
  onClose: () => void
}) {
  if (!user) return null

  const status = getUserStatus(user)
  const statusInfo = statusConfig[status]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
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
          <h2 className="text-lg font-semibold">Chi tiết người dùng</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Avatar & Basic Info */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                <Users className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">{user.name || "Chưa đặt tên"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-muted-foreground">{user.phone}</p>
              )}
            </div>
          </div>

          {/* Status & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
              <div className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", statusInfo.dot)} />
                <span className={cn("text-sm font-medium", statusInfo.color)}>{statusInfo.label}</span>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Vai trò</p>
              <Badge className={roleLabels[user.role]?.color || "bg-gray-100"}>
                {roleLabels[user.role]?.label || user.role}
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div>
            <p className="text-sm font-medium mb-3">Thống kê</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{user._count.products}</p>
                <p className="text-xs text-muted-foreground">Sản phẩm</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{user._count.ordersAsBuyer}</p>
                <p className="text-xs text-muted-foreground">Đơn mua</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{user._count.ordersAsSeller}</p>
                <p className="text-xs text-muted-foreground">Đơn bán</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">
                  {user.sellerStats?.avgRating != null ? Number(user.sellerStats.avgRating).toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Đánh giá</p>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div>
            <p className="text-sm font-medium mb-3">Thông tin tài khoản</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Ngày tạo</span>
                <span className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Xác thực</span>
                <span className="text-sm font-medium">
                  {user.isVerified ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Đã xác thực
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Chưa xác thực
                    </span>
                  )}
                </span>
              </div>
              {user.sellerStatus && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Seller Status</span>
                  <span className="text-sm font-medium">{user.sellerStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Hành động</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/orders?userId=${user.id}`}>
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Xem đơn hàng
                </Link>
              </Button>
              {user.role === "SELLER" && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/products?sellerId=${user.id}`}>
                    <Package className="h-4 w-4 mr-1.5" />
                    Xem sản phẩm
                  </Link>
                </Button>
              )}
              <Button
                variant={user.isLocked ? "default" : "outline"}
                size="sm"
                className={user.isLocked ? "" : "text-red-600 hover:text-red-700"}
              >
                {user.isLocked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-1.5" />
                    Mở khóa
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-1.5" />
                    Khóa tài khoản
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ============ BULK ACTION BAR ============
function BulkActionBar({
  selected,
  onClear,
  onLock,
}: {
  selected: Set<string>
  onClear: () => void
  onLock: () => void
}) {
  if (selected.size === 0) return null

  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between rounded-lg mb-3 shadow-lg">
      <span className="text-sm font-medium">
        Đã chọn {selected.size} người dùng
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={onLock}
        >
          <Lock className="h-4 w-4 mr-1.5" />
          Khóa tài khoản
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={() => {}}
        >
          <Bell className="h-4 w-4 mr-1.5" />
          Gửi thông báo
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={() => {}}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Xuất CSV
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClear}
        >
          <X className="h-4 w-4 mr-1.5" />
          Bỏ chọn
        </Button>
      </div>
    </div>
  )
}

// ============ SORT HEADER ============
function SortHeader({
  label,
  field,
  currentSort,
  sortDir,
  onSort,
}: {
  label: string
  field: string
  currentSort: string
  sortDir: "asc" | "desc"
  onSort: (field: string) => void
}) {
  const isActive = currentSort === field

  return (
    <button
      className={cn(
        "flex items-center gap-1 text-left text-sm font-medium transition-colors",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  )
}

// ============ MAIN PAGE ============
export default function AdminUsersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [users, setUsers] = React.useState<User[]>([])
  const [pagination, setPagination] = React.useState<Pagination | null>(null)
  const [counts, setCounts] = React.useState<Counts>({ ALL: 0, BUYER: 0, SELLER: 0, ADMIN: 0, LOCKED: 0, UNVERIFIED: 0 })
  const [loading, setLoading] = React.useState(true)

  const [roleFilter, setRoleFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [sortField, setSortField] = React.useState("createdAt")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())

  // Detail drawer
  const [detailUser, setDetailUser] = React.useState<User | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Action dialog
  const [showActionDialog, setShowActionDialog] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [actionType, setActionType] = React.useState<string>("")
  const [actionReason, setActionReason] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Auth check
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/users")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
    setCurrentPage(1)
  }

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== "ALL") params.set("role", roleFilter)
      if (searchQuery) params.set("search", searchQuery)
      params.set("page", currentPage.toString())
      params.set("sort", sortField)
      params.set("dir", sortDir)

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setPagination(data.pagination || null)
        setCounts(data.counts || {})
        setSelectedUsers(new Set())
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }, [roleFilter, searchQuery, currentPage, sortField, sortDir, status, session])

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchUsers()
    }
  }, [fetchUsers, status, session])

  // Handle row click
  const handleRowClick = (user: User) => {
    setDetailUser(user)
    setDrawerOpen(true)
  }

  // Handle actions
  const handleOpenAction = (user: User, action: string) => {
    setSelectedUser(user)
    setActionType(action)
    setActionReason("")
    setShowActionDialog(true)
  }

  const handleSubmitAction = async () => {
    if (!selectedUser || !actionType) return

    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = { action: actionType }
      if (actionReason) body.reason = actionReason

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowActionDialog(false)
        fetchUsers()
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

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedUsers)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedUsers(next)
  }

  const getActionDialogContent = () => {
    switch (actionType) {
      case "LOCK":
        return {
          title: "Khóa tài khoản",
          description: `Bạn có chắc muốn khóa tài khoản của ${selectedUser?.name || selectedUser?.email}?`,
        }
      case "UNLOCK":
        return {
          title: "Mở khóa tài khoản",
          description: `Bạn có chắc muốn mở khóa tài khoản của ${selectedUser?.name || selectedUser?.email}?`,
        }
      case "DELETE":
        return {
          title: "Xóa tài khoản",
          description: `Bạn có chắc muốn xóa tài khoản của ${selectedUser?.name || selectedUser?.email}? Hành động này không thể hoàn tác.`,
        }
      default:
        return { title: "", description: "" }
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
      <Breadcrumb items={[{ label: "Quản lý người dùng" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Quản lý tài khoản và phân quyền người dùng
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-64 pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả ({counts.ALL || 0})</SelectItem>
                <SelectItem value="BUYER">Người mua ({counts.BUYER || 0})</SelectItem>
                <SelectItem value="SELLER">Người bán ({counts.SELLER || 0})</SelectItem>
                <SelectItem value="ADMIN">Quản trị ({counts.ADMIN || 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards counts={counts} />

        {/* Bulk Action Bar */}
        <BulkActionBar
          selected={selectedUsers}
          onClear={() => setSelectedUsers(new Set())}
          onLock={() => {}}
        />

        {/* Users Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Người dùng" field="name" currentSort={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Vai trò</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Thống kê" field="products" currentSort={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Ngày tạo" field="createdAt" currentSort={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Không có người dùng nào
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className={cn(
                      "border-t hover:bg-muted/20 transition-colors",
                      selectedUsers.has(user.id) && "bg-primary/5"
                    )}>
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 cursor-pointer" onClick={() => handleRowClick(user)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name || "Avatar"} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.name || "Chưa đặt tên"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <Badge className={roleLabels[user.role]?.color || "bg-gray-100"}>
                          {roleLabels[user.role]?.label || user.role}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge user={user} />
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3 cursor-pointer" onClick={() => handleRowClick(user)}>
                        <UserStatsBadges user={user} />
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3 cursor-pointer" onClick={() => handleRowClick(user)}>
                        <p className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(user.createdAt)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRowClick(user)}
                          >
                            Chi tiết
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRowClick(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Xem hồ sơ
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/orders?userId=${user.id}`}>
                                  <ShoppingBag className="h-4 w-4 mr-2" />
                                  Xem đơn hàng
                                </Link>
                              </DropdownMenuItem>
                              {user.role === "SELLER" && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/products?sellerId=${user.id}`}>
                                    <Package className="h-4 w-4 mr-2" />
                                    Xem sản phẩm
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className={cn(
                                  user.isLocked ? "text-green-600" : "text-red-600"
                                )}
                                onClick={() =>
                                  handleOpenAction(user, user.isLocked ? "UNLOCK" : "LOCK")
                                }
                              >
                                {user.isLocked ? (
                                  <>
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Mở khóa tài khoản
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Khóa tài khoản
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Trang {pagination.page} / {pagination.totalPages} ({pagination.total} người dùng)
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
      </div>

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={detailUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionDialogContent().title}</DialogTitle>
            <DialogDescription>{getActionDialogContent().description}</DialogDescription>
          </DialogHeader>

          {actionType === "LOCK" && (
            <div className="space-y-2">
              <Label htmlFor="lock-reason">Lý do khóa tài khoản (bắt buộc)</Label>
              <Input
                id="lock-reason"
                placeholder="Ví dụ: Vi phạm điều khoản sử dụng"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                maxLength={500}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Hủy
            </Button>
            <Button
              variant={actionType === "DELETE" ? "destructive" : "default"}
              onClick={handleSubmitAction}
              disabled={isSubmitting || (actionType === "LOCK" && !actionReason.trim())}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
