"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  FileText,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  ArrowRight,
  BarChart3,
  PieChart,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

// Types
interface ReportData {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalProducts: number
  averageOrderValue: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topSellers: Array<{ name: string; orders: number; revenue: number }>
  revenueByDay: Array<{ date: string; label: string; revenue: number }>
  ordersByStatus: Record<string, number>
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>
}

type ReportType = "overview" | "sales" | "products" | "sellers" | "users"

const reportTypes: { key: ReportType; label: string; icon: string }[] = [
  { key: "overview", label: "Tổng quan", icon: "📊" },
  { key: "sales", label: "Doanh thu", icon: "💰" },
  { key: "products", label: "Sản phẩm", icon: "📦" },
  { key: "sellers", label: "Sellers", icon: "🏪" },
  { key: "users", label: "Người dùng", icon: "👥" },
]

export default function AdminReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [reportType, setReportType] = React.useState<ReportType>("overview")
  const [loading, setLoading] = React.useState(true)
  const [dateRange, setDateRange] = React.useState<"7d" | "30d" | "90d" | "1y">("30d")

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/reports")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  const generateMockReportData = (): ReportData => {
    const now = new Date()
    const revenueByDay = []
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      revenueByDay.push({
        date: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        revenue: Math.floor(Math.random() * 50000000) + 10000000,
      })
    }

    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthlyRevenue.push({
        month: date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
        revenue: Math.floor(Math.random() * 500000000) + 100000000,
        orders: Math.floor(Math.random() * 500) + 100,
      })
    }

    return {
      totalRevenue: 1250000000,
      totalOrders: 3420,
      totalUsers: 8540,
      totalProducts: 1245,
      averageOrderValue: 365000,
      topProducts: [
        { name: "iPhone 15 Pro Max", quantity: 156, revenue: 234000000 },
        { name: "Samsung Galaxy S24", quantity: 134, revenue: 189000000 },
        { name: "Xiaomi 14", quantity: 98, revenue: 98000000 },
        { name: "OPPO Find X7", quantity: 76, revenue: 76000000 },
        { name: "Vivo X100", quantity: 65, revenue: 65000000 },
      ],
      topSellers: [
        { name: "Minh Phone Store", orders: 234, revenue: 89000000 },
        { name: "Phone G3", orders: 198, revenue: 75600000 },
        { name: "Cellphone S", orders: 167, revenue: 63400000 },
        { name: "TechZone", orders: 145, revenue: 55000000 },
        { name: "Smart Buy", orders: 123, revenue: 46700000 },
      ],
      revenueByDay,
      ordersByStatus: {
        COMPLETED: 2800,
        CANCELLED: 320,
        SHIPPING: 180,
        PENDING: 120,
      },
      monthlyRevenue,
    }
  }

  const reportData = generateMockReportData()
  const maxRevenue = Math.max(...reportData.revenueByDay.map(d => d.revenue), 1)
  const maxMonthlyRevenue = Math.max(...reportData.monthlyRevenue.map(d => d.revenue), 1)
  const maxOrders = Math.max(...reportData.monthlyRevenue.map(d => d.orders), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Báo cáo & Thống kê
          </h1>
          <p className="text-muted-foreground">Xem và xuất các báo cáo chi tiết</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất PDF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {reportTypes.map((type) => (
          <button
            key={type.key}
            onClick={() => setReportType(type.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              reportType === type.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span className="mr-2">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Khoảng thời gian:</span>
        <div className="flex items-center bg-muted rounded-lg p-1">
          {(["7d", "30d", "90d", "1y"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                dateRange === range ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {range === "7d" ? "7 ngày" : range === "30d" ? "30 ngày" : range === "90d" ? "90 ngày" : "1 năm"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-xl font-bold">{formatCurrency(reportData.totalRevenue, true)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
                <p className="text-xl font-bold">{reportData.totalOrders.toLocaleString("vi-VN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Người dùng</p>
                <p className="text-xl font-bold">{reportData.totalUsers.toLocaleString("vi-VN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-orange-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá trị TB</p>
                <p className="text-xl font-bold">{formatCurrency(reportData.averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Doanh thu theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {reportData.revenueByDay.slice(-14).map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {formatCurrency(day.revenue)}
                  </div>
                  <div
                    className="w-full bg-green-500 hover:bg-green-600 transition-colors rounded-t"
                    style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 5)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{reportData.revenueByDay[reportData.revenueByDay.length - 14]?.label}</span>
              <span>{reportData.revenueByDay[reportData.revenueByDay.length - 1]?.label}</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue & Orders */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Doanh thu & Đơn hàng theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {reportData.monthlyRevenue.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    <div className="font-medium">{month.month}</div>
                    <div>{formatCurrency(month.revenue)}</div>
                    <div>{month.orders} đơn</div>
                  </div>
                  <div
                    className="w-full bg-blue-400 hover:bg-blue-500 transition-colors rounded-t"
                    style={{ height: `${Math.max((month.revenue / maxMonthlyRevenue) * 100, 5)}%` }}
                  />
                  <div
                    className="w-full bg-green-500 transition-colors rounded-t"
                    style={{ height: `${Math.max((month.orders / maxOrders) * 30, 2)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-muted-foreground">Doanh thu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Đơn hàng</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                Top Sản phẩm
              </span>
              <Badge variant="outline">{reportData.topProducts.length} sản phẩm</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.topProducts.map((product, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-yellow-500 text-white" :
                    i === 1 ? "bg-gray-400 text-white" :
                    i === 2 ? "bg-amber-600 text-white" :
                    "bg-gray-200 text-gray-600"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} đã bán</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Sellers */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Top Sellers
              </span>
              <Badge variant="outline">{reportData.topSellers.length} sellers</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.topSellers.map((seller, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-yellow-500 text-white" :
                    i === 1 ? "bg-gray-400 text-white" :
                    i === 2 ? "bg-amber-600 text-white" :
                    "bg-gray-200 text-gray-600"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller.orders} đơn</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(seller.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-500" />
            Đơn hàng theo trạng thái
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1 space-y-2">
              {Object.entries(reportData.ordersByStatus).map(([status, count]) => {
                const colors: Record<string, string> = {
                  COMPLETED: "bg-green-500",
                  CANCELLED: "bg-red-500",
                  SHIPPING: "bg-blue-500",
                  PENDING: "bg-yellow-500",
                }
                const labels: Record<string, string> = {
                  COMPLETED: "Hoàn thành",
                  CANCELLED: "Đã hủy",
                  SHIPPING: "Đang giao",
                  PENDING: "Chờ xử lý",
                }
                const percentage = Math.round((count / reportData.totalOrders) * 100)
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={cn("h-3 w-3 rounded-full", colors[status] || "bg-gray-500")} />
                    <span className="text-sm w-24">{labels[status] || status}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", colors[status] || "bg-gray-500")}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-20 text-right">{count.toLocaleString("vi-VN")}</span>
                    <span className="text-xs text-muted-foreground w-12">{percentage}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
