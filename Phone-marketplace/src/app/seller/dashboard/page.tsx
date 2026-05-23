"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Eye,
  Plus,
  ArrowRight,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingDown,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface DashboardStats {
  totalProducts: number
  activeProducts: number
  pendingProducts: number
  soldProducts: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
  avgRating: number
  totalReviews: number
  revenueChange?: number
  ordersChange?: number
}

interface RecentOrder {
  id: string
  orderCode: string
  status: string
  totalAmount: number
  createdAt: string
  buyer: { name: string; avatar?: string | null }
  itemCount: number
}

interface RecentProduct {
  id: string
  title: string
  slug: string
  price: number
  status: string
  images: { url: string }[]
  createdAt: string
  viewCount?: number
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  PAID: { label: "Đã thanh toán", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  CONFIRMED: { label: "Đã xác nhận", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  SHIPPING: { label: "Đang giao", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  DELIVERED: { label: "Đã giao", color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200" },
  COMPLETED: { label: "Hoàn thành", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  CANCELLED: { label: "Đã hủy", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  REFUNDED: { label: "Hoàn tiền", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = React.useState<RecentOrder[]>([])
  const [recentProducts, setRecentProducts] = React.useState<RecentProduct[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/dashboard")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SELLER" && session?.user?.sellerStatus !== "APPROVED") {
        router.push("/seller/register")
        return
      }
      fetchDashboardData()
    }
  }, [status, session, router])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes, productsRes] = await Promise.all([
        fetch("/api/seller/stats"),
        fetch("/api/seller/orders?limit=5"),
        fetch("/api/seller/products?limit=5"),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setRecentOrders(data.orders || [])
      }

      if (productsRes.ok) {
        const data = await productsRes.json()
        setRecentProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
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
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {session?.user?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground mt-1">
            Đây là tổng quan cửa hàng của bạn hôm nay
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Đăng sản phẩm mới
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Sản phẩm đang bán</p>
                <p className="text-3xl font-bold">{stats?.activeProducts || 0}</p>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {stats?.pendingProducts || 0} đang chờ duyệt
                  </Badge>
                </div>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Đơn hàng mới</p>
                <p className="text-3xl font-bold">{stats?.pendingOrders || 0}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{stats?.totalOrders || 0} tổng đơn hàng</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-green-600" />
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
                  {Number(stats?.totalRevenue || 0).toLocaleString("vi-VN")}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {stats?.revenueChange !== undefined && (
                    <>
                      {stats.revenueChange >= 0 ? (
                        <Badge variant="secondary" className="text-green-600 bg-green-50 text-xs font-normal gap-1">
                          <TrendingUp className="h-3 w-3" />
                          +{stats.revenueChange}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-red-600 bg-red-50 text-xs font-normal gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {stats.revenueChange}%
                        </Badge>
                      )}
                    </>
                  )}
                  <span className="text-muted-foreground">VNĐ</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-500/0" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Đánh giá</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold">
                    {stats?.avgRating ? Number(stats.avgRating).toFixed(1) : "0.0"}
                  </p>
                  <span className="text-lg text-muted-foreground">/5</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-muted-foreground">
                    {stats?.totalReviews || 0} đánh giá
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Thao tác nhanh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/seller/products/new" className="block">
              <div className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Đăng sản phẩm mới</p>
                    <p className="text-sm text-muted-foreground">Thêm sản phẩm vào cửa hàng</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link href="/seller/products" className="block">
              <div className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 hover:border-green-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Quản lý sản phẩm</p>
                    <p className="text-sm text-muted-foreground">Sửa hoặc ẩn sản phẩm</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link href="/seller/orders" className="block">
              <div className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 hover:border-blue-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Xem đơn hàng</p>
                    <p className="text-sm text-muted-foreground">Cập nhật trạng thái đơn</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Đơn hàng gần đây
            </CardTitle>
            <Link href="/seller/orders">
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
                  const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
                  return (
                    <Link key={order.id} href={`/seller/orders/${order.id}`} className="block">
                      <div className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 hover:border-primary/20 transition-all group">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {order.buyer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{order.orderCode}</span>
                            <Badge className={cn("text-xs border-0", status.bg, status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {order.buyer.name} • {order.itemCount} sản phẩm
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {order.totalAmount.toLocaleString("vi-VN")}đ
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("vi-VN")}
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

      {/* Recent Products & Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Products */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Sản phẩm gần đây
            </CardTitle>
            <Link href="/seller/products">
              <Button variant="ghost" size="sm" className="gap-1">
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">Chưa có sản phẩm nào</p>
                <Link href="/seller/products/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Đăng sản phẩm mới
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {recentProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/seller/products/${product.slug}/edit`}
                    className="group"
                  >
                    <div className="rounded-xl border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all">
                      <div className="aspect-square bg-muted relative">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <Badge
                          className={cn(
                            "absolute top-2 right-2 text-xs border-0",
                            product.status === "ACTIVE" && "bg-green-500",
                            product.status === "PENDING" && "bg-yellow-500",
                            product.status !== "ACTIVE" && product.status !== "PENDING" && "bg-gray-500"
                          )}
                        >
                          {product.status === "ACTIVE"
                            ? "Đang bán"
                            : product.status === "PENDING"
                            ? "Chờ duyệt"
                            : product.status}
                        </Badge>
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {product.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-primary font-semibold text-sm">
                            {product.price.toLocaleString("vi-VN")}đ
                          </p>
                          {product.viewCount !== undefined && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {product.viewCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tổng quan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Đang bán</span>
                  <span className="font-semibold">{stats?.activeProducts || 0}</span>
                </div>
                <Progress value={stats?.totalProducts ? (stats.activeProducts / stats.totalProducts) * 100 : 0} className="h-2 bg-green-100 [&>div]:bg-green-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Chờ duyệt</span>
                  <span className="font-semibold">{stats?.pendingProducts || 0}</span>
                </div>
                <Progress value={stats?.totalProducts ? (stats.pendingProducts / stats.totalProducts) * 100 : 0} className="h-2 bg-yellow-100 [&>div]:bg-yellow-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Đã bán</span>
                  <span className="font-semibold">{stats?.soldProducts || 0}</span>
                </div>
                <Progress value={stats?.totalProducts ? (stats.soldProducts / stats.totalProducts) * 100 : 0} className="h-2 bg-blue-100 [&>div]:bg-blue-500" />
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tổng sản phẩm</span>
                <span className="font-semibold">{stats?.totalProducts || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đơn hoàn thành</span>
                <span className="font-semibold">{stats?.completedOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đơn đang xử lý</span>
                <span className="font-semibold">{stats?.pendingOrders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
