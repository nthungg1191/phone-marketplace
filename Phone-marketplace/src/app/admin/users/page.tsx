"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Breadcrumb } from "@/components/shared/breadcrumb"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const roleLabels: Record<string, { label: string; color: string }> = {
  BUYER: { label: "Người mua", color: "bg-blue-100 text-blue-800" },
  SELLER: { label: "Người bán", color: "bg-green-100 text-green-800" },
  ADMIN: { label: "Quản trị", color: "bg-purple-100 text-purple-800" },
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [users, setUsers] = React.useState<User[]>([])
  const [pagination, setPagination] = React.useState<Pagination | null>(null)
  const [counts, setCounts] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)

  const [roleFilter, setRoleFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)

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

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== "ALL") params.set("role", roleFilter)
      if (searchQuery) params.set("search", searchQuery)
      params.set("page", currentPage.toString())

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setPagination(data.pagination || null)
        setCounts(data.counts || {})
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }, [roleFilter, searchQuery, currentPage, status, session])

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchUsers()
    }
  }, [fetchUsers, status, session])

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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
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

        {/* Users Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Người dùng</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Vai trò</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Thống kê</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Không có người dùng nào
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name || "Avatar"}
                                className="w-full h-full object-cover"
                              />
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
                      <td className="px-4 py-3">
                        <Badge className={roleLabels[user.role]?.color || "bg-gray-100"}>
                          {roleLabels[user.role]?.label || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {user.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <Lock className="h-3 w-3" /> Đã khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <Unlock className="h-3 w-3" /> Hoạt động
                            </span>
                          )}
                          {user.isVerified && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                              <CheckCircle className="h-3 w-3" /> Đã xác thực
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Sản phẩm: {user._count.products}</p>
                          <p>Mua: {user._count.ordersAsBuyer} | Bán: {user._count.ordersAsSeller}</p>
                          {user.sellerStats && (
                            <p>Đánh giá: {typeof user.sellerStats?.avgRating === 'number' ? user.sellerStats.avgRating.toFixed(1) : "N/A"} ★</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {user.isLocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAction(user, "UNLOCK")}
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Mở khóa
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleOpenAction(user, "LOCK")}
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Khóa
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
          {pagination && pagination.totalPages > 1 && (
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
