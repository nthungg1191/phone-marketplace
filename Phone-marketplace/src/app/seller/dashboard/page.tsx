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
  TrendingDown,
  Eye,
  Plus,
  ArrowRight,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  BarChart3,
  RefreshCw,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ThumbsUp,
  Calendar,
  RefreshCcw,
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
  cancelledOrders: number
  shippingOrders: number
  totalRevenue: number
  thisMonthRevenue: number
  revenueChange: number
  avgRating: number
  totalReviews: number
  successRate: number
  cancellationRate: number
  ordersByStatus: Record<string, number>
  ordersByDay: Array<{
    date: string
    count: number
    revenue: number
  }>
  topProducts: Array<{
    id: string
    title: string
    slug: string
    price: number
    images: Array<{ url: string }>
    salesCount: number
  } | null>
  recentReviews: Array<{
    id: string
    rating: number
    comment: string | null
    createdAt: string
    reviewer: { name: string; avatar: string | null }
    product: { title: string; slug: string }
  }>
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
  RECEIVED: { label: "Đã nhận", color: "text-blue-600", bg: "bg-blue-100 border-blue-200" },
  RETURN_PERIOD: { label: "Dùng thử", color: "text-teal-600", bg: "bg-teal-50 border-teal-200" },
  RETURN_PENDING: { label: "Chờ trả hàng", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  COMPLETED: { label: "Hoàn thành", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  CANCELLED: { label: "Đã hủy", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  REFUNDED: { label: "Hoàn tiền", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
}

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-500",
  PAID: "bg-blue-500",
  CONFIRMED: "bg-indigo-500",
  SHIPPING: "bg-purple-500",
  DELIVERED: "bg-cyan-500",
  RECEIVED: "bg-blue-600",
  RETURN_PERIOD: "bg-teal-500",
  RETURN_PENDING: "bg-amber-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
  REFUNDED: "bg-orange-500",
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = React.useState<RecentOrder[]>([])
  const [recentProducts, setRecentProducts] = React.useState<RecentProduct[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

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
      setLoading(true)
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
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate max revenue for chart
  const maxRevenue = stats?.ordersByDay.reduce((max, day) => 
    Math.max(max, day.revenue), 0) || 0

  // Format date for chart
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" })
  }

  // Calculate total from orders by day
  const totalWeekOrders = stats?.ordersByDay.reduce((sum, day) => sum + day.count, 0) || 0
  const totalWeekRevenue = stats?.ordersByDay.reduce((sum, day) => sum + day.revenue, 0) || 0

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Chào buổi sáng"
    if (hour < 18) return "Chào buổi chiều"
    return "Chào buổi tối"
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, {session?.user?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground mt-1">
            {lastUpdated && `Cập nhật lần cuối: ${lastUpdated.toLocaleTimeString("vi-VN")}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDashboardData}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Làm mới
          </Button>
          <Link href="/seller/products/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Đăng sản phẩm mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Doanh thu</p>
                <p className="text-2xl font-bold">
                  {(stats?.totalRevenue || 0) >= 1000000 
                    ? `${((stats?.totalRevenue || 0) / 1000000).toFixed(1)}M`
                    : (stats?.totalRevenue || 0).toLocaleString("vi-VN")
                  }đ
                </p>
                <div className="flex items-center gap-1">
                  {stats?.revenueChange !== undefined && stats.revenueChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">+{stats.revenueChange}%</span>
                    </>
                  ) : stats?.revenueChange !== undefined ? (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-600">{stats.revenueChange}%</span>
                    </>
                  ) : null}
                  <span className="text-xs text-muted-foreground">tháng này</span>
                </div>
              </div>
              <div className="h-11 w-11 bg-green-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Đơn hàng</p>
                <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
                <p className="text-xs text-yellow-600">
                  {stats?.pendingOrders || 0} đơn đang xử lý
                </p>
              </div>
              <div className="h-11 w-11 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Sản phẩm</p>
                <p className="text-2xl font-bold">{stats?.activeProducts || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingProducts || 0} đang chờ duyệt
                </p>
              </div>
              <div className="h-11 w-11 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Đánh giá</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">
                    {stats?.avgRating ? Number(stats.avgRating).toFixed(1) : "0.0"}
                  </p>
                  <span className="text-sm text-muted-foreground">/5</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-muted-foreground">
                    {stats?.totalReviews || 0} đánh giá
                  </span>
                </div>
              </div>
              <div className="h-11 w-11 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Orders Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Doanh thu 7 ngày gần nhất</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Đơn hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Doanh thu</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Tổng đơn: </span>
                <span className="font-semibold">{totalWeekOrders}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tổng doanh thu: </span>
                <span className="font-semibold text-green-600">
                  {totalWeekRevenue.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
            
            {/* Simple Bar Chart */}
            <div className="h-36 flex items-end gap-2">
              {stats?.ordersByDay.map((day, i) => {
                const heightPercent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
                const orderHeight = totalWeekOrders > 0 ? (day.count / Math.max(...stats.ordersByDay.map(d => d.count), 1)) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-1 h-28">
                      <div 
                        className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${Math.max(orderHeight, 5)}%` }}
                        title={`${day.count} đơn`}
                      />
                      <div 
                        className="flex-1 bg-green-500/60 rounded-t transition-all hover:bg-green-500/80"
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        title={`${day.revenue.toLocaleString("vi-VN")}đ`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatChartDate(day.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Hiệu suất
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Tỷ lệ thành công
                </span>
                <span className="font-semibold">{stats?.successRate || 0}%</span>
              </div>
              <Progress value={stats?.successRate || 0} className="h-2 bg-muted [&>div]:bg-green-500" />
            </div>

            {/* Cancellation Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-red-500" />
                  Tỷ lệ hủy đơn
                </span>
                <span className="font-semibold">{stats?.cancellationRate || 0}%</span>
              </div>
              <Progress value={stats?.cancellationRate || 0} className="h-2 bg-muted [&>div]:bg-red-500" />
            </div>

            {/* Completed Orders */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Đơn hoàn thành</span>
              </div>
              <span className="font-bold text-green-600">{stats?.completedOrders || 0}</span>
            </div>

            {/* Shipping Orders */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Đang vận chuyển</span>
              </div>
              <span className="font-bold text-blue-600">{stats?.shippingOrders || 0}</span>
            </div>

            {/* Pending Orders */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Chờ xử lý</span>
              </div>
              <span className="font-bold text-yellow-600">{stats?.pendingOrders || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Sản phẩm bán chạy
              </span>
              <Link href="/seller/products">
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">
                  Xem tất cả
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.topProducts || stats.topProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào được bán</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.filter(Boolean).map((product: any, index: number) => (
                  <Link key={product.id} href={`/seller/products/${product.slug}/edit`} className="block">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className="h-10 w-10 bg-muted rounded-lg overflow-hidden relative shrink-0">
                        {product.images && product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {product.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.salesCount} đã bán
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-green-600">
                        #{index + 1}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Đơn hàng gần đây
              </span>
              <Link href="/seller/orders">
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">
                  Xem tất cả
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => {
                  const statusInfo = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
                  return (
                    <Link key={order.id} href={`/seller/orders/${order.id}`} className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 hover:border-primary/20 transition-all group">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {order.buyer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{order.orderCode}</span>
                            <Badge className={cn("text-xs border-0", statusInfo.bg, statusInfo.color)}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.buyer.name} • {order.itemCount} sản phẩm
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-primary">
                            {order.totalAmount.toLocaleString("vi-VN")}đ
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
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

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders by Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Đơn theo trạng thái
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.ordersByStatus || {})
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([status, count]) => {
                  const config = statusConfig[status] || { label: status, color: "text-gray-600", bg: "bg-gray-50" }
                  const percent = stats?.totalOrders ? Math.round((count / stats.totalOrders) * 100) : 0
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={config.color}>{config.label}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", statusColors[status] || "bg-gray-500")}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-amber-500" />
                Đánh giá gần đây
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentReviews || stats.recentReviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có đánh giá nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentReviews.map((review) => (
                  <div key={review.id} className="flex items-start gap-3 p-3 rounded-xl border">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold text-xs">
                        {review.reviewer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.reviewer.name}</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {review.product.title}
                      </p>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/seller/products/new" className="block">
          <Card className="border-0 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Plus className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-primary transition-colors">Đăng sản phẩm mới</p>
                  <p className="text-sm text-muted-foreground">Thêm sản phẩm vào cửa hàng</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/seller/products" className="block">
          <Card className="border-0 shadow-sm hover:shadow-md hover:border-green-500/30 transition-all group cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                  <Package className="h-6 w-6 text-green-600 group-hover:text-white" />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-green-600 transition-colors">Quản lý sản phẩm</p>
                  <p className="text-sm text-muted-foreground">Sửa hoặc ẩn sản phẩm</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/seller/orders" className="block">
          <Card className="border-0 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all group cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <ShoppingBag className="h-6 w-6 text-blue-600 group-hover:text-white" />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-blue-600 transition-colors">Xem đơn hàng</p>
                  <p className="text-sm text-muted-foreground">Cập nhật trạng thái đơn</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
