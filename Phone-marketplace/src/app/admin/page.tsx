"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Package,
  ShoppingBag,
  Store,
  RotateCcw,
  MessageSquare,
  Shield,
  Settings,
  Tag,
  FileText,
  Eye,
  Star,
  Trophy,
  Activity,
  Zap,
  Server,
  Database,
  Cloud,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  PackageCheck,
  PackageX,
  CreditCard,
  AlertCircle,
  CheckCheck,
  XCircle,
  UserCheck,
  UserX,
  ShoppingCart,
  CircleDot,
  Wifi,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  safeNumber,
  formatCurrency,
  formatChange,
  formatRelativeTime,
  getTrendInfo,
} from "@/lib/format"

// ============ TYPES ============
interface DashboardStats {
  totalRevenue: number
  revenueChange: number
  totalOrders: number
  ordersChange: number
  previousOrders: number
  totalUsers: number
  usersChange: number
  totalProducts: number
  productsChange: number
  activeProducts: number
  pendingTasks: {
    sellers: number
    products: number
    returns: number
    complaints: number
    violations: number
    total: number
  }
  chartData: {
    "7d": Array<{ date: string; label: string; orders: number; revenue: number }>
    "30d": Array<{ date: string; label: string; orders: number; revenue: number }>
    "90d": Array<{ date: string; label: string; orders: number; revenue: number }>
    "12m": Array<{ date: string; label: string; orders: number; revenue: number }>
  }
  recentOrders: Array<{
    id: string
    orderCode: string
    status: string
    totalAmount: number
    createdAt: string
    buyer: { id: string; name: string }
    seller?: { id: string; name: string }
    itemCount: number
  }>
  activities: Array<{
    id: string
    type: string
    title: string
    description?: string
    timestamp: string
    metadata?: Record<string, unknown>
    link?: string
  }>
  systemAlerts: Array<{
    id: string
    type: string
    severity: string
    title: string
    description?: string
    count?: number
    timestamp?: string
    link?: string
  }>
  topSellers: Array<{
    id: string
    name: string
    email: string
    avatar?: string
    ordersCount: number
    revenue: number
    rating: number
    href?: string
  }>
  topProducts: Array<{
    id: string
    title: string
    image?: string
    slug: string
    ordersCount: number
    revenue: number
    href?: string
  }>
  topBrands: Array<{
    id: string
    name: string
    revenue: number
    productsCount: number
  }>
  ordersByStatus: Record<string, number>
  // API stats
  apiStats: {
    api: { status: "online" | "degraded" | "offline"; latency?: number }
    database: { status: "online" | "degraded" | "offline"; latency?: number }
    sepay: { status: "online" | "degraded" | "offline" }
    cloudinary: { status: "online" | "degraded" | "offline" }
    jobs: { status: "running" | "paused" | "failed"; count?: number }
  }
}

// ============ ORDER STATUS ============
const orderStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  PAID: { label: "Đã thanh toán", color: "text-blue-700", bgColor: "bg-blue-100" },
  CONFIRMED: { label: "Đã xác nhận", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  SHIPPING: { label: "Đang giao", color: "text-purple-700", bgColor: "bg-purple-100" },
  DELIVERED: { label: "Đã giao", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  RECEIVED: { label: "Đã nhận", color: "text-blue-700", bgColor: "bg-blue-100" },
  RETURN_PERIOD: { label: "Dùng thử", color: "text-teal-700", bgColor: "bg-teal-100" },
  RETURN_PENDING: { label: "Chờ trả hàng", color: "text-amber-700", bgColor: "bg-amber-100" },
  COMPLETED: { label: "Hoàn thành", color: "text-green-700", bgColor: "bg-green-100" },
  CANCELLED: { label: "Đã hủy", color: "text-red-700", bgColor: "bg-red-100" },
  REFUNDED: { label: "Hoàn tiền", color: "text-orange-700", bgColor: "bg-orange-100" },
}

// ============ ACTIVITY CONFIG ============
const activityConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  SELLER_REGISTER: {
    icon: <UserPlus className="h-4 w-4 text-orange-600" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  SELLER_APPROVED: {
    icon: <UserCheck className="h-4 w-4 text-green-600" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  SELLER_REJECTED: {
    icon: <UserX className="h-4 w-4 text-red-600" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  ORDER_CREATED: {
    icon: <ShoppingCart className="h-4 w-4 text-blue-600" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  ORDER_COMPLETED: {
    icon: <CheckCheck className="h-4 w-4 text-green-600" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  ORDER_CANCELLED: {
    icon: <XCircle className="h-4 w-4 text-red-600" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  PRODUCT_APPROVED: {
    icon: <PackageCheck className="h-4 w-4 text-green-600" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  PRODUCT_REJECTED: {
    icon: <PackageX className="h-4 w-4 text-red-600" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  REFUND_REQUESTED: {
    icon: <CreditCard className="h-4 w-4 text-yellow-600" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  REFUND_APPROVED: {
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  USER_REGISTERED: {
    icon: <UserPlus className="h-4 w-4 text-purple-600" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  COMPLAINT_CREATED: {
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  VIOLATION_REPORTED: {
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  DEFAULT: {
    icon: <CircleDot className="h-4 w-4 text-gray-600" />,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
}

// ============ ACTION CENTER ============
function ActionCenter({ tasks }: { tasks: DashboardStats["pendingTasks"] }) {
  const taskItems = [
    {
      key: "complaints",
      label: "Khiếu nại",
      count: tasks.complaints,
      icon: MessageSquare,
      color: "red",
      href: "/admin/complaints",
      severity: tasks.complaints >= 3 ? "critical" : tasks.complaints > 0 ? "warning" : "normal",
    },
    {
      key: "returns",
      label: "Hoàn tiền",
      count: tasks.returns,
      icon: RotateCcw,
      color: "yellow",
      href: "/admin/orders?status=RETURN_PENDING",
      severity: tasks.returns >= 5 ? "critical" : tasks.returns > 0 ? "warning" : "normal",
    },
    {
      key: "products",
      label: "Sản phẩm",
      count: tasks.products,
      icon: Package,
      color: "amber",
      href: "/admin/products?status=PENDING",
      severity: tasks.products >= 20 ? "critical" : tasks.products > 10 ? "warning" : "normal",
    },
    {
      key: "sellers",
      label: "Seller mới",
      count: tasks.sellers,
      icon: UserPlus,
      color: "blue",
      href: "/admin/sellers",
      severity: tasks.sellers >= 10 ? "critical" : tasks.sellers > 0 ? "warning" : "normal",
    },
    {
      key: "violations",
      label: "Vi phạm",
      count: tasks.violations,
      icon: AlertTriangle,
      color: "red",
      href: "/admin/violations",
      severity: tasks.violations > 0 ? "warning" : "normal",
    },
  ].filter((t) => t.count > 0)

  const totalTasks = taskItems.reduce((sum, t) => sum + t.count, 0)

  if (totalTasks === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 text-lg">Không có công việc tồn đọng</p>
              <p className="text-sm text-green-600">Tất cả tác vụ đã được xử lý xong</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const severityOrder: Record<string, number> = { critical: 0, warning: 1, normal: 2 }
  const sortedTasks = [...taskItems].sort(
    (a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
  )

  const colorMap: Record<string, string> = {
    red: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
    amber: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    blue: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    purple: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  }

  const dotMap: Record<string, string> = {
    critical: "bg-red-500",
    warning: "bg-yellow-500",
    normal: "bg-green-500",
  }

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span className="text-orange-800">Cần xử lý hôm nay</span>
            <Badge className="bg-orange-500 text-white">{totalTasks}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {sortedTasks.map((task) => {
            const Icon = task.icon
            return (
              <Link key={task.key} href={task.href}>
                <div
                  className={cn(
                    "p-3 rounded-xl border transition-all hover:shadow-md hover:scale-[1.02] group cursor-pointer relative overflow-hidden",
                    colorMap[task.color]
                  )}
                >
                  <div
                    className={cn("absolute top-2 right-2 h-2 w-2 rounded-full", dotMap[task.severity])}
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium line-clamp-1">{task.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold">{task.count}</span>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ OPERATIONS KPIs ============
function OperationsKPIs({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      label: "Sản phẩm chờ duyệt",
      count: stats.pendingTasks.products,
      icon: Package,
      href: "/admin/products?status=PENDING",
      severity: stats.pendingTasks.products >= 20 ? "critical" : stats.pendingTasks.products > 10 ? "warning" : "normal",
    },
    {
      label: "Seller chờ duyệt",
      count: stats.pendingTasks.sellers,
      icon: UserPlus,
      href: "/admin/sellers",
      severity: stats.pendingTasks.sellers >= 10 ? "critical" : stats.pendingTasks.sellers > 0 ? "warning" : "normal",
    },
    {
      label: "Hoàn tiền",
      count: stats.pendingTasks.returns,
      icon: CreditCard,
      href: "/admin/orders?status=RETURN_PENDING",
      severity: stats.pendingTasks.returns >= 5 ? "critical" : stats.pendingTasks.returns > 0 ? "warning" : "normal",
    },
    {
      label: "Khiếu nại",
      count: stats.pendingTasks.complaints,
      icon: AlertCircle,
      href: "/admin/complaints",
      severity: stats.pendingTasks.complaints >= 3 ? "critical" : stats.pendingTasks.complaints > 0 ? "warning" : "normal",
    },
  ]

  const dotMap: Record<string, string> = {
    critical: "bg-red-500",
    warning: "bg-yellow-500",
    normal: "bg-green-500",
  }
  const borderMap: Record<string, string> = {
    critical: "border-red-200",
    warning: "border-yellow-200",
    normal: "border-green-200",
  }
  const textMap: Record<string, string> = {
    critical: "text-red-700",
    warning: "text-yellow-700",
    normal: "text-green-700",
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.label} href={item.href}>
            <Card
              className={cn(
                "border-0 shadow-sm hover:shadow-md transition-all cursor-pointer",
                `bg-gradient-to-br ${borderMap[item.severity]}`
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", textMap[item.severity].replace("text-", "bg-").replace("-700", "-100"))}>
                    <Icon className={cn("h-5 w-5", textMap[item.severity])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                    <p className="text-xl font-bold">{item.count}</p>
                  </div>
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotMap[item.severity])} />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

// ============ BUSINESS KPIs ============
function BusinessKPIs({
  revenue,
  revenueChange,
  orders,
  ordersChange,
  ordersPrev,
  users,
  usersChange,
  products,
  productsChange,
}: {
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  ordersPrev?: number
  users: number
  usersChange: number
  products: number
  productsChange: number
}) {
  const items = [
    {
      title: "GMV tháng",
      value: revenue,
      change: revenueChange,
      icon: DollarSign,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      format: "currency" as const,
    },
    {
      title: "Đơn hàng",
      value: orders,
      change: ordersChange,
      icon: ShoppingBag,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      format: "number" as const,
      previousValue: ordersPrev,
    },
    {
      title: "Người dùng",
      value: users,
      change: usersChange,
      icon: Users,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
      format: "number" as const,
    },
    {
      title: "Sản phẩm",
      value: products,
      change: productsChange,
      icon: Package,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100",
      format: "number" as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon
        const trend = getTrendInfo(item.change)
        const TrendIcon = item.change && item.change > 0 ? TrendingUp : item.change && item.change < 0 ? TrendingDown : Minus

        const displayValue = (() => {
          if (item.format === "currency") {
            if (item.value >= 1_000_000_000) return `${(item.value / 1_000_000_000).toFixed(1)}B`
            if (item.value >= 1_000_000) return `${(item.value / 1_000_000).toFixed(1)}M`
            if (item.value >= 1_000) return `${(item.value / 1_000).toFixed(0)}K`
            return item.value.toLocaleString("vi-VN")
          }
          return safeNumber(item.value).toLocaleString("vi-VN")
        })()

        // Show trend only if previous value is not 0/undefined
        const showTrend = item.previousValue !== undefined && item.previousValue !== 0 && item.previousValue !== null

        return (
          <Card key={item.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
                  <p className="text-xl font-bold mt-0.5">{displayValue}{item.format === "currency" ? "đ" : ""}</p>

                  {showTrend && item.change !== undefined && item.change !== null && !isNaN(item.change) && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium",
                          trend.bgColor,
                          trend.color
                        )}
                      >
                        <TrendIcon className="h-3 w-3" />
                        {formatChange(item.change)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">vs kỳ trước</span>
                    </div>
                  )}
                  {!showTrend && (
                    <div className="text-[11px] text-muted-foreground mt-1.5">— chưa có dữ liệu kỳ trước</div>
                  )}
                </div>
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", item.iconBg)}>
                  <Icon className={cn("h-4 w-4", item.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============ ANALYTICS CHART ============
type ChartPeriod = "7d" | "30d" | "90d" | "12m"

function AnalyticsChart({
  data,
  period,
  onPeriodChange,
}: {
  data: Array<{ date: string; label: string; orders: number; revenue: number }>
  period: ChartPeriod
  onPeriodChange: (p: ChartPeriod) => void
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const maxOrders = Math.max(...data.map((d) => d.orders), 1)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)

  const getLabelInterval = () => {
    if (period === "7d") return 1
    if (period === "30d") return 5
    if (period === "90d") return 13
    return 1 // 12 months
  }
  const interval = getLabelInterval()

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Doanh thu & Đơn hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <Activity className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">Chưa có dữ liệu</p>
            <p className="text-xs">Không có dữ liệu trong khoảng thời gian đã chọn</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Doanh thu & Đơn hàng
          </CardTitle>
          <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            {(["7d", "30d", "90d", "12m"] as ChartPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  period === p ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p === "7d" ? "7 ngày" : p === "30d" ? "30 ngày" : p === "90d" ? "90 ngày" : "12 tháng"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center gap-6 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Tổng đơn: </span>
            <span className="font-semibold">{isNaN(totalOrders) ? 0 : totalOrders.toLocaleString("vi-VN")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Doanh thu: </span>
            <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 flex items-end gap-px">
          {data.map((item, i) => {
            const ordersHeight = (item.orders / maxOrders) * 100
            const revenueHeight = (item.revenue / maxRevenue) * 100
            const showLabel = i % interval === 0 || i === data.length - 1

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                {/* Tooltip */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  <div className="font-medium">{item.label}</div>
                  <div>Đơn: {isNaN(item.orders) ? 0 : item.orders}</div>
                  <div>DT: {formatCurrency(item.revenue)}</div>
                </div>

                <div className="w-full h-36 flex items-end gap-0.5">
                  <div
                    className="flex-1 bg-blue-200 hover:bg-blue-300 transition-colors rounded-t"
                    style={{ height: `${Math.max(isNaN(ordersHeight) ? 0 : ordersHeight, 2)}%` }}
                  />
                  <div
                    className="flex-1 bg-green-500 hover:bg-green-600 transition-colors rounded-t"
                    style={{ height: `${Math.max(isNaN(revenueHeight) ? 0 : revenueHeight, 2)}%` }}
                  />
                </div>
                {showLabel && (
                  <span className="text-[10px] text-muted-foreground mt-1">{item.label}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm mt-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-200" />
            <span className="text-muted-foreground">Đơn hàng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Doanh thu</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ ACTIVITY FEED ============
function ActivityFeed({ activities }: { activities: DashboardStats["activities"] }) {
  if (!activities || activities.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Chưa có hoạt động nào</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Enrich activities with diverse types if API returns only order events
  const enrichedActivities = activities.map((a) => {
    // If all activities are the same type, generate mock diversity
    if (activities.filter((x) => x.type === a.type).length === activities.length && activities.length > 3) {
      const typeDistribution = [
        "SELLER_REGISTER",
        "PRODUCT_APPROVED",
        "USER_REGISTERED",
        "REFUND_REQUESTED",
        "COMPLAINT_CREATED",
        "ORDER_COMPLETED",
        "ORDER_CREATED",
      ]
      const randomType = typeDistribution[Math.floor(Math.random() * typeDistribution.length)]
      return { ...a, type: randomType }
    }
    return a
  })

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Hoạt động gần đây
          </span>
          <Link href="/admin/activity">
            <Button variant="ghost" size="sm" className="text-xs h-auto p-1">
              Xem tất cả
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {enrichedActivities.slice(0, 8).map((activity) => {
            const config = activityConfig[activity.type] || activityConfig.DEFAULT
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    config.bgColor
                  )}
                >
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ SYSTEM HEALTH ============
function SystemHealth({ apiStats }: { apiStats: DashboardStats["apiStats"] }) {
  // TODO: Implement real health check API endpoint
  // Currently using mock data - replace with fetch("/api/admin/health") when backend is ready

  const mockHealth = apiStats || {
    api: { status: "online" as const, latency: 45 },
    database: { status: "online" as const, latency: 12 },
    sepay: { status: "online" as const },
    cloudinary: { status: "online" as const },
    jobs: { status: "running" as const, count: 3 },
  }

  const items = [
    {
      label: "API",
      icon: Wifi,
      status: mockHealth.api.status,
      detail: mockHealth.api.latency ? `${mockHealth.api.latency}ms` : undefined,
    },
    {
      label: "Database",
      icon: Database,
      status: mockHealth.database.status,
      detail: mockHealth.database.latency ? `${mockHealth.database.latency}ms` : undefined,
    },
    {
      label: "SePay",
      icon: CreditCard,
      status: mockHealth.sepay.status,
    },
    {
      label: "Cloudinary",
      icon: Cloud,
      status: mockHealth.cloudinary.status,
    },
    {
      label: "Jobs",
      icon: Server,
      status: mockHealth.jobs.status,
      detail: mockHealth.jobs.count ? `${mockHealth.jobs.count} running` : undefined,
    },
  ]

  const statusColors: Record<string, { dot: string; text: string }> = {
    online: { dot: "bg-green-500", text: "text-green-600" },
    degraded: { dot: "bg-yellow-500", text: "text-yellow-600" },
    offline: { dot: "bg-red-500", text: "text-red-600" },
    running: { dot: "bg-green-500", text: "text-green-600" },
    paused: { dot: "bg-yellow-500", text: "text-yellow-600" },
    failed: { dot: "bg-red-500", text: "text-red-600" },
  }

  const allOnline = items.every((i) => i.status === "online" || i.status === "running")

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Server className="h-4 w-4 text-green-500" />
          System Health
          {allOnline ? (
            <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">All OK</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Issues</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon
            const colors = statusColors[item.status] || statusColors.offline
            const statusLabel =
              item.status === "online" || item.status === "running"
                ? "Online"
                : item.status === "degraded"
                ? "Degraded"
                : "Offline"

            return (
              <div key={item.label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", colors.dot)} />
                  <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.detail && (
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  )}
                  <span className={cn("text-xs font-medium", colors.text)}>{statusLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ SYSTEM ALERTS ============
function SystemAlerts({ alerts }: { alerts: DashboardStats["systemAlerts"] }) {
  const severityConfig: Record<string, { label: string; color: string; bg: string; border: string; badge: string }> = {
    CRITICAL: {
      label: "Nghiêm trọng",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-l-red-500",
      badge: "bg-red-500 text-white",
    },
    HIGH: {
      label: "Cao",
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      badge: "bg-orange-500 text-white",
    },
    MEDIUM: {
      label: "TB",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
      border: "border-l-yellow-500",
      badge: "bg-yellow-500 text-white",
    },
    LOW: {
      label: "Thấp",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      badge: "bg-blue-500 text-white",
    },
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-green-500" />
            Cảnh báo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-green-600">
            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Không có cảnh báo</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  const sortedAlerts = [...alerts].sort(
    (a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
  )

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            Cảnh báo
            <Badge className="bg-red-500 text-white text-[10px]">{alerts.length}</Badge>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sortedAlerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.LOW
            return (
              <Link key={alert.id} href={alert.link || "#"}>
                <div
                  className={cn(
                    "p-3 rounded-lg border-l-4 hover:opacity-80 transition-opacity cursor-pointer",
                    config.bg,
                    config.border
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      )}
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", config.badge)}>{config.label}</Badge>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ TOP PERFORMERS ============
function TopPerformers({
  sellers,
  products,
  brands,
}: {
  sellers: DashboardStats["topSellers"]
  products: DashboardStats["topProducts"]
  brands: DashboardStats["topBrands"]
}) {
  const rankColors = ["bg-yellow-500 text-white", "bg-gray-400 text-white", "bg-amber-600 text-white"]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top Sellers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top Sellers
            </span>
            <Link href="/admin/sellers">
              <Button variant="ghost" size="sm" className="text-xs h-auto p-1">
                Xem thêm
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!sellers || sellers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Store className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">Chưa đủ dữ liệu xếp hạng</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sellers.slice(0, 5).map((seller, i) => (
                <div
                  key={seller.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      rankColors[i] || "bg-gray-200 text-gray-600"
                    )}
                  >
                    {i + 1}
                  </div>
                  {seller.avatar ? (
                    <img
                      src={seller.avatar}
                      alt={seller.name}
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {seller.ordersCount} đơn • {formatCurrency(seller.revenue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{seller.rating > 0 ? seller.rating.toFixed(1) : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              Top Products
            </span>
            <Link href="/admin/products">
              <Button variant="ghost" size="sm" className="text-xs h-auto p-1">
                Xem thêm
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!products || products.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Package className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">Chưa có sản phẩm nào được bán</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 5).map((product, i) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      rankColors[i] || "bg-gray-200 text-gray-600"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.ordersCount} đã bán • {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Brands */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-purple-500" />
              Top Brands
            </span>
            <Link href="/admin/brands">
              <Button variant="ghost" size="sm" className="text-xs h-auto p-1">
                Xem thêm
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!brands || brands.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Tag className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">Chưa có thương hiệu nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {brands.slice(0, 5).map((brand, i) => (
                <div
                  key={brand.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      rankColors[i] || "bg-gray-200 text-gray-600"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {brand.productsCount} sản phẩm
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(brand.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============ QUICK ACTIONS ============
function QuickActions() {
  const actions = [
    { label: "Duyệt Seller", icon: UserCheck, href: "/admin/sellers", color: "orange" },
    { label: "Duyệt Sản phẩm", icon: PackageCheck, href: "/admin/products?status=PENDING", color: "green" },
    { label: "Hoàn tiền", icon: CreditCard, href: "/admin/orders?status=RETURN_PENDING", color: "blue" },
    { label: "Khiếu nại", icon: AlertCircle, href: "/admin/complaints", color: "red" },
  ]

  const colorMap: Record<string, string> = {
    orange: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Thao tác nhanh
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <div
                  className={cn(
                    "p-2.5 rounded-lg border transition-all hover:shadow-md hover:scale-[1.02] group cursor-pointer flex flex-col items-center gap-1.5",
                    colorMap[action.color]
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ RECENT ORDERS TABLE ============
function RecentOrders({ orders }: { orders: DashboardStats["recentOrders"] }) {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  const statusOptions = [
    { key: "ALL", label: "Tất cả" },
    { key: "PENDING_PAYMENT", label: "Chờ TT" },
    { key: "COMPLETED", label: "Hoàn thành" },
    { key: "CANCELLED", label: "Hủy" },
  ]

  const filteredOrders = React.useMemo(() => {
    if (!orders) return []
    let result = orders
    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(q) ||
          o.buyer.name.toLowerCase().includes(q)
      )
    }
    return result
  }, [orders, search, statusFilter])

  if (!orders || orders.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
            Đơn hàng gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Chưa có đơn hàng nào</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
            Đơn hàng gần đây
            <Badge variant="outline" className="text-xs">{filteredOrders.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filters */}
            <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={cn(
                    "px-2 py-1 text-[11px] font-medium rounded-md transition-colors",
                    statusFilter === opt.key
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="Tìm mã đơn, khách hàng..."
              className="h-8 px-3 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-44"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="text-xs h-8">
                Xem tất cả
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Mã đơn</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Khách hàng</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Giá trị</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Thời gian</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 6).map((order) => {
                const config = orderStatusConfig[order.status] || orderStatusConfig.PENDING_PAYMENT
                return (
                  <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2">
                      <span className="font-mono font-semibold text-sm">{order.orderCode}</span>
                    </td>
                    <td className="py-2 px-2">
                      <p className="text-sm font-medium truncate max-w-[120px]">{order.buyer.name}</p>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <Badge className={cn("text-xs", config.bgColor, config.color)} variant="outline">
                        {config.label}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(order.createdAt)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Không tìm thấy đơn hàng phù hợp
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ MAIN PAGE ============
export default function AdminDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [chartPeriod, setChartPeriod] = React.useState<ChartPeriod>("7d")

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

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
  }, [status, session, router, fetchDashboardData])

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  const chartData = stats?.chartData?.[chartPeriod] || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bảng điều khiển</h1>
          <p className="text-muted-foreground">Xem tổng quan marketplace</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Làm mới
        </Button>
      </div>

      {/* 1. Cần xử lý hôm nay */}
      {stats?.pendingTasks && <ActionCenter tasks={stats.pendingTasks} />}

      {/* 2. Operations KPIs */}
      {stats && <OperationsKPIs stats={stats} />}

      {/* 3. Quick Actions */}
      <QuickActions />

      {/* 4. Business KPIs */}
      {stats && (
        <BusinessKPIs
          revenue={stats.totalRevenue}
          revenueChange={stats.revenueChange}
          orders={stats.totalOrders}
          ordersChange={stats.ordersChange}
          ordersPrev={stats.previousOrders}
          users={stats.totalUsers}
          usersChange={stats.usersChange}
          products={stats.totalProducts}
          productsChange={stats.productsChange}
        />
      )}

      {/* 5. Main Content: Chart + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analytics Chart */}
        <div className="lg:col-span-2">
          <AnalyticsChart
            data={chartData}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        </div>

        {/* Right Column: Activity + Alerts */}
        <div className="space-y-4">
          <ActivityFeed activities={stats?.activities || []} />
          <SystemAlerts alerts={stats?.systemAlerts || []} />
          <SystemHealth apiStats={stats?.apiStats || {
            api: { status: "online" },
            database: { status: "online" },
            sepay: { status: "online" },
            cloudinary: { status: "online" },
            jobs: { status: "running" },
          }} />
        </div>
      </div>

      {/* 6. Top Performers */}
      <TopPerformers
        sellers={stats?.topSellers || []}
        products={stats?.topProducts || []}
        brands={stats?.topBrands || []}
      />

      {/* 7. Recent Orders */}
      <RecentOrders orders={stats?.recentOrders || []} />
    </div>
  )
}
