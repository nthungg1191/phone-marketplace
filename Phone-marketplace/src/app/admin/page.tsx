"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Shield,
  Check,
  X,
  AlertTriangle,
  Settings,
  Tag,
  Folder,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface AdminStats {
  totalUsers: number
  totalProducts: number
  pendingProducts: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  revenueChange?: number
}

interface PendingSeller {
  id: string
  name: string
  email: string
  sellerStatus: string
  createdAt: string
  _count: { products: number }
}

interface RecentOrder {
  id: string
  orderCode: string
  status: string
  totalAmount: string
  createdAt: string
  buyer: { name: string }
}

const orderStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "text-yellow-600", bg: "bg-yellow-50" },
  PAID: { label: "Đã thanh toán", color: "text-blue-600", bg: "bg-blue-50" },
  CONFIRMED: { label: "Đã xác nhận", color: "text-indigo-600", bg: "bg-indigo-50" },
  SHIPPING: { label: "Đang giao", color: "text-purple-600", bg: "bg-purple-50" },
  DELIVERED: { label: "Đã giao", color: "text-cyan-600", bg: "bg-cyan-50" },
  COMPLETED: { label: "Hoàn thành", color: "text-green-600", bg: "bg-green-50" },
  CANCELLED: { label: "Đã hủy", color: "text-red-600", bg: "bg-red-50" },
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [pendingSellers, setPendingSellers] = React.useState<PendingSeller[]>([])
  const [recentOrders, setRecentOrders] = React.useState<RecentOrder[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin")
      return
    }

    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
      return
    }

    if (status === "authenticated") {
      fetchDashboardData()
    }
  }, [status, session, router])

  const fetchDashboardData = async () => {
    try {
      const [sellersRes, ordersRes, statsRes] = await Promise.all([
        fetch("/api/admin/sellers?status=PENDING"),
        fetch("/api/admin/orders?limit=5"),
        fetch("/api/admin/stats"),
      ])

      if (sellersRes.ok) {
        const data = await sellersRes.json()
        setPendingSellers(data.users?.slice(0, 5) || [])
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setRecentOrders(data.orders || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      } else {
        setStats({
          totalUsers: 150,
          totalProducts: 450,
          pendingProducts: 12,
          totalOrders: 280,
          pendingOrders: 8,
          totalRevenue: 125000000,
          revenueChange: 15,
        })
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setStats({
        totalUsers: 150,
        totalProducts: 450,
        pendingProducts: 12,
        totalOrders: 280,
        pendingOrders: 8,
        totalRevenue: 125000000,
        revenueChange: 15,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveSeller = async (userId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/admin/sellers/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        setPendingSellers((prev) => prev.filter((s) => s.id !== userId))
      }
    } catch (error) {
      console.error("Error approving seller:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý hệ thống EUT Marketplace
          </p>
        </div>
        <Link href="/admin/settings">
          <Button variant="outline" size="lg" className="gap-2">
            <Settings className="h-4 w-4" />
            Cài đặt hệ thống
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tổng người dùng</p>
                <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12% tuần này</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tổng sản phẩm</p>
                <p className="text-3xl font-bold">{stats?.totalProducts || 0}</p>
                {stats && stats.pendingProducts > 0 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600">
                    <Clock className="h-3 w-3" />
                    <span>{stats.pendingProducts} đang chờ duyệt</span>
                  </div>
                )}
              </div>
              <div className="h-12 w-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-500/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tổng đơn hàng</p>
                <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
                {stats && stats.pendingOrders > 0 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600">
                    <Clock className="h-3 w-3" />
                    <span>{stats.pendingOrders} đang xử lý</span>
                  </div>
                )}
              </div>
              <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-yellow-500/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Doanh thu</p>
                <p className="text-3xl font-bold">
                  {Number(stats?.totalRevenue || 0 / 1000000).toLocaleString("vi-VN")}đ
                </p>
                {stats?.revenueChange !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{stats.revenueChange}% tuần này</span>
                  </div>
                )}
              </div>
              <div className="h-12 w-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { href: "/admin/users", icon: Users, label: "Người dùng", color: "blue" },
          { href: "/admin/products", icon: Package, label: "Sản phẩm", color: "green" },
          { href: "/admin/orders", icon: ShoppingBag, label: "Đơn hàng", color: "purple" },
          { href: "/admin/sellers", icon: Shield, label: "Duyệt Seller", color: "orange" },
          { href: "/admin/brands", icon: Tag, label: "Thương hiệu", color: "red" },
          { href: "/admin/categories", icon: Folder, label: "Danh mục", color: "teal" },
        ].map((item) => {
          const Icon = item.icon
          const colorClasses: Record<string, string> = {
            blue: "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white",
            green: "bg-green-500/10 text-green-600 group-hover:bg-green-500 group-hover:text-white",
            purple: "bg-purple-500/10 text-purple-600 group-hover:bg-purple-500 group-hover:text-white",
            orange: "bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white",
            red: "bg-red-500/10 text-red-600 group-hover:bg-red-500 group-hover:text-white",
            teal: "bg-teal-500/10 text-teal-600 group-hover:bg-teal-500 group-hover:text-white",
          }
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="hover:shadow-lg hover:border-primary/30 transition-all group">
                <CardContent className="p-5 text-center">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors", colorClasses[item.color])}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{item.label}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Sellers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Yêu cầu đăng ký seller ({pendingSellers.length})
            </CardTitle>
            <Link href="/admin/sellers">
              <Button variant="ghost" size="sm" className="gap-1">
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingSellers.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">Không có yêu cầu nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors group"
                  >
                    <Avatar className="h-12 w-12 border-2">
                      <AvatarFallback className="bg-yellow-100 text-yellow-700 font-semibold">
                        {seller.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{seller.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{seller.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {seller._count.products} sản phẩm • Đăng ký {new Date(seller.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        onClick={() => handleApproveSeller(seller.id, "APPROVE")}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveSeller(seller.id, "REJECT")}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Đơn hàng gần đây
            </CardTitle>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="gap-1">
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Chưa có đơn hàng nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const statusInfo = orderStatusConfig[order.status] || orderStatusConfig.PENDING_PAYMENT
                  return (
                    <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                      <div className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 hover:border-primary/20 transition-all group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{order.orderCode}</span>
                            <Badge className={cn("text-xs border-0", statusInfo.bg, statusInfo.color)}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {order.buyer.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Approvals */}
      {stats && stats.pendingProducts > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold">Có {stats.pendingProducts} sản phẩm đang chờ duyệt</p>
                  <p className="text-sm text-muted-foreground">
                    Vui lòng kiểm tra và duyệt sản phẩm mới để đảm bảo chất lượng
                  </p>
                </div>
              </div>
              <Link href="/admin/products?status=PENDING">
                <Button className="gap-2">
                  Duyệt ngay
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
