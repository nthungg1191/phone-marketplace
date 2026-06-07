"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Star,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  CheckCircle,
  FileText,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ===== Global Formatters =====
const vnFormatter = new Intl.NumberFormat("vi-VN")

function formatVN(value: number): string {
  return vnFormatter.format(value)
}

function formatCurrency(value: number): string {
  if (value === 0) return "0đ"
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return vnFormatter.format(value)
}

// ===== Data Point Types =====
interface DataPoint {
  period: string
  label: string
  startDate: Date
  endDate: Date
  revenue: number
  orders: number
  avgOrderValue: number
}

interface ReportData {
  from: string
  to: string
  groupBy: "day" | "week" | "month"
  generatedAt: string
  summary: {
    totalRevenue: number
    totalOrders: number
    completedOrders: number
    cancelledOrders: number
    returnedOrders: number
    revenueChange: number
    ordersChange: number
    completedChange: number
    avgOrderValue: number
    prevRevenue: number
    prevTotalOrders: number
  }
  revenueByPeriod: Array<{
    period: string
    revenue: number
    orders: number
  }>
  ordersByStatus: Record<string, number>
  topProducts: Array<{
    id: string
    title: string
    price: number
    status: string
    viewCount: number
    image: string | null
    salesCount: number
    salesRevenue: number
  }>
  lowStockProducts: Array<{
    id: string
    title: string
    price: number
    status: string
    viewCount: number
    image: string | null
    salesCount: number
    salesRevenue: number
  }>
  reviews: {
    total: number
    avgRating: number
    distribution: Record<number, number>
  }
}

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  RECEIVED: "Đã nhận",
  RETURN_PERIOD: "Dùng thử",
  RETURN_PENDING: "Chờ trả hàng",
  RETURN_APPROVED: "Duyệt trả",
  RETURN_REJECTED: "Từ chối trả",
  FRAUD_BUYER: "Gian lận Buyer",
  FRAUD_SELLER: "Gian lận Seller",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REFUNDED: "Hoàn tiền",
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
  RETURN_APPROVED: "bg-blue-400",
  RETURN_REJECTED: "bg-red-400",
  FRAUD_BUYER: "bg-red-600",
  FRAUD_SELLER: "bg-red-600",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
  REFUNDED: "bg-orange-500",
}

type Preset = "7d" | "30d" | "90d" | "12m" | "custom"

function toDateInputString(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateVN(d: Date) {
  return d.toLocaleDateString("vi-VN")
}

function getPresetRange(preset: Exclude<Preset, "custom">): { from: Date; to: Date } {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const to = new Date(now)
  const from = new Date(to)
  if (preset === "7d") from.setDate(from.getDate() - 6)
  else if (preset === "30d") from.setDate(from.getDate() - 29)
  else if (preset === "90d") from.setDate(from.getDate() - 89)
  else if (preset === "12m") from.setMonth(from.getMonth() - 11)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

export default function SellerReportPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [report, setReport] = React.useState<ReportData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [preset, setPreset] = React.useState<Preset>("30d")
  const [customFrom, setCustomFrom] = React.useState("")
  const [customTo, setCustomTo] = React.useState("")
  const [showDatePicker, setShowDatePicker] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  const [appliedRange, setAppliedRange] = React.useState<{ from: Date; to: Date }>(() => getPresetRange("30d"))

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/report")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SELLER" && session?.user?.sellerStatus !== "APPROVED") {
        router.push("/seller/register")
        return
      }
      fetchReport(appliedRange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router])

  const fetchReport = async (range: { from: Date; to: Date }) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        from: toDateInputString(range.from),
        to: toDateInputString(range.to),
      })
      const res = await fetch(`/api/seller/report?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetChange = (newPreset: Preset) => {
    if (newPreset === "custom") {
      setShowDatePicker(true)
      setPreset("custom")
      return
    }
    setPreset(newPreset)
    setShowDatePicker(false)
    setValidationError(null)
    const range = getPresetRange(newPreset)
    setAppliedRange(range)
    setCustomFrom(toDateInputString(range.from))
    setCustomTo(toDateInputString(range.to))
    fetchReport(range)
  }

  const handleApplyCustomRange = () => {
    setValidationError(null)
    if (!customFrom || !customTo) {
      setValidationError("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc")
      return
    }
    const from = new Date(customFrom)
    const to = new Date(customTo)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      setValidationError("Ngày không hợp lệ")
      return
    }
    if (from > to) {
      setValidationError("Ngày bắt đầu phải trước ngày kết thúc")
      return
    }
    if (to > today) {
      setValidationError("Không thể chọn ngày trong tương lai")
      return
    }
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
    if (daysDiff > 365) {
      setValidationError("Khoảng thời gian tối đa là 365 ngày")
      return
    }

    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)
    setAppliedRange({ from, to })
    setShowDatePicker(false)
    fetchReport({ from, to })
  }

  const handleQuickSelect = (type: "today" | "yesterday" | "7d" | "30d" | "thisMonth" | "lastMonth") => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(23, 59, 59, 999)

    let from = new Date(today)
    let to = new Date(now)

    if (type === "today") {
      // from = to = today
    } else if (type === "yesterday") {
      from = new Date(today)
      from.setDate(from.getDate() - 1)
      to = new Date(from)
      to.setHours(23, 59, 59, 999)
    } else if (type === "7d") {
      from = new Date(today)
      from.setDate(from.getDate() - 6)
    } else if (type === "30d") {
      from = new Date(today)
      from.setDate(from.getDate() - 29)
    } else if (type === "thisMonth") {
      from = new Date(today.getFullYear(), today.getMonth(), 1)
      to = new Date(now)
    } else if (type === "lastMonth") {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      to = new Date(today.getFullYear(), today.getMonth(), 0)
      to.setHours(23, 59, 59, 999)
    }

    setCustomFrom(toDateInputString(from))
    setCustomTo(toDateInputString(to))
  }

  const formatCurrencyKpi = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toLocaleString("vi-VN")
  }

  const exportCSV = () => {
    if (!report) return
    const csvContent = [
      ["Kỳ báo cáo", "Doanh thu", "Số đơn"],
      ...report.revenueByPeriod.map(r => [r.period, r.revenue, r.orders]),
    ].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `bao-cao-${report.from}-${report.to}.csv`
    link.click()
  }

  if (loading && !report) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  const hasData = report && (report.summary.totalRevenue > 0 || report.summary.totalOrders > 0)
  const groupBy = report?.groupBy || "day"
  const groupByLabel =
    groupBy === "day" ? "theo ngày" : groupBy === "week" ? "theo tuần" : "theo tháng"

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* ===== Analytics Header ===== */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo & Thống kê</h1>
          {report && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Dữ liệu từ <span className="font-medium text-foreground">{formatDateVN(new Date(report.from))}</span>
              <span>→</span>
              <span className="font-medium text-foreground">{formatDateVN(new Date(report.to))}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground">
                {Math.ceil((new Date(report.to).getTime() - new Date(report.from).getTime()) / (24 * 60 * 60 * 1000)) + 1} ngày
              </span>
            </p>
          )}
        </div>

        {/* Segmented Control + Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div
            role="tablist"
            aria-label="Khoảng thời gian"
            className="inline-flex items-center bg-muted rounded-lg p-1 gap-0.5 overflow-x-auto max-w-full"
          >
            {[
              { key: "7d", label: "7 ngày" },
              { key: "30d", label: "30 ngày" },
              { key: "90d", label: "90 ngày" },
              { key: "12m", label: "12 tháng" },
              { key: "custom", label: "Tùy chọn" },
            ].map((item) => {
              const isActive = preset === item.key
              return (
                <button
                  key={item.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handlePresetChange(item.key as Preset)}
                  className={cn(
                    "px-3 lg:px-4 h-8 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReport(appliedRange)}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-2"
              disabled={!report}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </Button>
          </div>
        </div>

        {/* Date Range Picker */}
        {showDatePicker && (
          <Card className="border-0 shadow-lg p-0 overflow-visible">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-sm">Chọn khoảng thời gian</h3>
                <button
                  onClick={() => {
                    setShowDatePicker(false)
                    setValidationError(null)
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-4 border-r space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Lựa chọn nhanh
                  </p>
                  {[
                    { key: "today", label: "Hôm nay" },
                    { key: "yesterday", label: "Hôm qua" },
                    { key: "7d", label: "7 ngày gần nhất" },
                    { key: "30d", label: "30 ngày gần nhất" },
                    { key: "thisMonth", label: "Tháng này" },
                    { key: "lastMonth", label: "Tháng trước" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleQuickSelect(item.key as any)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Từ ngày</label>
                      <input
                        type="date"
                        value={customFrom}
                        max={customTo || toDateInputString(new Date())}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full h-9 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Đến ngày</label>
                      <input
                        type="date"
                        value={customTo}
                        min={customFrom}
                        max={toDateInputString(new Date())}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full h-9 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <CalendarPicker
                    from={customFrom}
                    to={customTo}
                    onSelect={(from, to) => {
                      setCustomFrom(from)
                      setCustomTo(to)
                    }}
                  />

                  {validationError && (
                    <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">
                      {validationError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDatePicker(false)
                    setValidationError(null)
                  }}
                >
                  Hủy
                </Button>
                <Button size="sm" onClick={handleApplyCustomRange}>
                  Áp dụng
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== KPI Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Doanh thu"
          value={`${formatCurrencyKpi(report?.summary.totalRevenue || 0)}đ`}
          change={report?.summary.revenueChange}
          prevValue={report?.summary.prevRevenue}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Đơn hàng"
          value={String(report?.summary.totalOrders || 0)}
          change={report?.summary.ordersChange}
          prevValue={report?.summary.prevTotalOrders}
          icon={ShoppingBag}
          color="blue"
        />
        <KPICard
          title="Tỷ lệ hoàn thành"
          value={
            report?.summary.totalOrders
              ? `${Math.round(((report.summary.completedOrders || 0) / report.summary.totalOrders) * 100)}%`
              : "0%"
          }
          subValue={`${report?.summary.completedOrders || 0}/${report?.summary.totalOrders || 0} đơn`}
          icon={CheckCircle}
          color="emerald"
        />
        <KPICard
          title="Đánh giá TB"
          value={report?.reviews.avgRating ? `${report.reviews.avgRating} ⭐` : "—"}
          subValue={`${report?.reviews.total || 0} đánh giá`}
          icon={Star}
          color="amber"
        />
      </div>

      {/* ===== Revenue Chart ===== */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Doanh thu {groupByLabel}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-3 rounded-sm bg-primary" />
                <span className="text-muted-foreground">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-3 rounded-sm bg-green-500" />
                <span className="text-muted-foreground">Số đơn</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {hasData ? (
            <RevenueChart data={report!.revenueByPeriod} groupBy={groupBy} />
          ) : (
            <EmptyChartState />
          )}
        </CardContent>
      </Card>

      {/* ===== Orders Status & Top Products ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Đơn theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <div className="space-y-2.5">
                {Object.entries(report!.ordersByStatus)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([status, count]) => {
                    const percent = report!.summary.totalOrders > 0
                      ? Math.round((count / report!.summary.totalOrders) * 100)
                      : 0
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="text-muted-foreground truncate">
                            {statusLabels[status] || status}
                          </span>
                          <span className="font-medium shrink-0">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", statusColors[status] || "bg-gray-500")}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Chưa có đơn hàng trong khoảng này
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Sản phẩm bán chạy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report && report.topProducts.length > 0 ? (
              <div className="space-y-1.5">
                {report.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-green-100 text-green-700 font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.salesCount} đã bán
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0 shrink-0 text-xs">
                      {formatCurrencyKpi(product.salesRevenue)}đ
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Chưa có sản phẩm nào được bán
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Bottom Row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              Cần cải thiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report && report.lowStockProducts.length > 0 ? (
              <div className="space-y-1.5">
                {report.lowStockProducts.slice(0, 4).map((product) => (
                  <div key={product.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-700 shrink-0">
                      <Eye className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">{product.viewCount} lượt xem</p>
                    </div>
                    <Badge variant="outline" className="border-amber-200 text-amber-700 shrink-0 text-xs">
                      Chưa bán
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Tất cả sản phẩm đều có đơn
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Phân bố đánh giá
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report && report.reviews.total > 0 ? (
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = report.reviews.distribution[rating] || 0
                  const percent = report.reviews.total > 0 ? (count / report.reviews.total) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-10 shrink-0">
                        <span className="text-xs font-medium">{rating}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Chưa có đánh giá
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Summary Footer ===== */}
      {report && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Tóm tắt kỳ báo cáo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Doanh thu kỳ này</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(report.summary.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Kỳ trước</p>
                <p className="text-lg font-bold">
                  {formatCurrency(report.summary.prevRevenue)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">SP đã bán</p>
                <p className="text-base font-bold">
                  {report.topProducts.reduce((sum, p) => sum + p.salesCount, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Giá trị TB</p>
                <p className="text-base font-bold">
                  {formatCurrency(report.summary.avgOrderValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đơn hủy</p>
                <p className="text-base font-bold text-red-600">
                  {report.summary.cancelledOrders}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hoàn tiền</p>
                <p className="text-base font-bold text-orange-600">
                  {report.summary.returnedOrders}
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Cập nhật lần cuối: {lastUpdated.toLocaleTimeString("vi-VN")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===== KPI Card Component =====
function KPICard({
  title,
  value,
  change,
  prevValue,
  subValue,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  change?: number
  prevValue?: number
  subValue?: string
  icon: React.ComponentType<{ className?: string }>
  color: "green" | "blue" | "emerald" | "amber"
}) {
  const colorClasses = {
    green: "bg-green-500/10 text-green-600",
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", colorClasses[color])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="text-xl font-bold truncate">{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {change >= 0 ? (
              <ArrowUpRight className="h-3 w-3 text-green-600 shrink-0" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-600 shrink-0" />
            )}
            <span className={cn("text-xs", change >= 0 ? "text-green-600" : "text-red-600")}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
            <span className="text-xs text-muted-foreground">vs kỳ trước</span>
          </div>
        )}
        {subValue && !change && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ===== Build Data Points =====
function buildDataPoints(
  rawData: Array<{ period: string; revenue: number; orders: number }>,
  groupBy: "day" | "week" | "month"
): DataPoint[] {
  return rawData.map((item) => {
    let startDate: Date
    let endDate: Date
    let label: string

    if (groupBy === "day") {
      startDate = new Date(item.period)
      endDate = new Date(item.period)
      label = new Date(item.period).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } else if (groupBy === "week") {
      const [year, weekStr] = item.period.split("-W")
      const weekNum = parseInt(weekStr)
      const jan1 = new Date(parseInt(year), 0, 1)
      const dayOfWeek = jan1.getDay() === 0 ? 6 : jan1.getDay() - 1
      startDate = new Date(jan1)
      startDate.setDate(jan1.getDate() - dayOfWeek + (weekNum - 1) * 7)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      label = `Tuần ${weekNum}`
    } else {
      const [year, month] = item.period.split("-").map(Number)
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0)
      label = `Tháng ${month.toString().padStart(2, "0")}/${year}`
    }

    const avgOrderValue = item.orders > 0 ? Math.round(item.revenue / item.orders) : 0

    return {
      period: item.period,
      label,
      startDate,
      endDate,
      revenue: item.revenue,
      orders: item.orders,
      avgOrderValue,
    }
  })
}

// ===== Revenue Chart =====
function RevenueChart({
  data,
  groupBy,
}: {
  data: Array<{ period: string; revenue: number; orders: number }>
  groupBy: "day" | "week" | "month"
}) {
  const [tooltip, setTooltip] = React.useState<{
    index: number
    x: number
    y: number
  } | null>(null)

  const prevDataRef = React.useRef<typeof data>([])
  const [prevData, setPrevData] = React.useState<typeof data>([])

  React.useEffect(() => {
    setPrevData(prevDataRef.current)
    prevDataRef.current = data
  }, [data])

  const getRevChangePercent = (currentRevenue: number, idx: number): number | undefined => {
    if (idx >= prevData.length || prevData[idx].revenue === 0) return undefined
    const prev = prevData[idx]
    return Math.round(((currentRevenue - prev.revenue) / prev.revenue) * 100)
  }

  const buildXLabel = (periodStr: string): string => {
    if (groupBy === "day") {
      return new Date(periodStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      })
    }
    if (groupBy === "week") return `T${periodStr.split("-W")[1]}`
    if (groupBy === "month") {
      const [year, month] = periodStr.split("-")
      return `T${month}/${year.slice(2)}`
    }
    return periodStr
  }

  const dataPoints = React.useMemo(
    () => buildDataPoints(data, groupBy),
    [data, groupBy]
  )

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const maxOrders = Math.max(...data.map(d => d.orders), 1)

  const getLabelInterval = (): number => {
    if (groupBy === "day") {
      if (data.length <= 7) return 1
      if (data.length <= 31) return 5
      return 7
    }
    return 1
  }
  const labelInterval = getLabelInterval()

  const chartHeightPx = 280
  const leftAxisWidth = "56px"
  const rightAxisWidth = "36px"

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)

  const handleBarHover = (e: React.MouseEvent, idx: number) => {
    const svg = e.currentTarget.ownerSVGElement!
    const svgRect = svg.getBoundingClientRect()
    const barRect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      index: idx,
      x: barRect.left - svgRect.left + barRect.width / 2,
      y: barRect.top - svgRect.top,
    })
  }

  return (
    <div className="w-full">
      {/* Y-axis + Chart */}
      <div className="flex">
        {/* Left Y-axis: Revenue */}
        <div
          className="flex flex-col justify-between text-right pr-2 shrink-0"
          style={{ width: leftAxisWidth, height: `${chartHeightPx}px` }}
        >
          <span className="text-[11px] text-muted-foreground">{formatCurrencyShort(maxRevenue)}</span>
          <span className="text-[11px] text-muted-foreground">{formatCurrencyShort(maxRevenue * 0.75)}</span>
          <span className="text-[11px] text-muted-foreground">{formatCurrencyShort(maxRevenue * 0.5)}</span>
          <span className="text-[11px] text-muted-foreground">{formatCurrencyShort(maxRevenue * 0.25)}</span>
          <span className="text-[11px] text-muted-foreground">0</span>
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: `${chartHeightPx}px`, overflow: "visible" }}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((p, i) => (
              <line
                key={`grid-${i}`}
                x1="0"
                y1={p}
                x2="100"
                y2={p}
                stroke="currentColor"
                strokeWidth="0.3"
                className="text-muted-foreground/20"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Bars */}
            {data.map((item, i) => {
              const revenueHeight = (item.revenue / maxRevenue) * 100
              const ordersHeight = (item.orders / maxOrders) * 100
              const barGap = data.length > 20 ? 0.08 : data.length > 10 ? 0.12 : 0.2
              const barW = (100 - barGap * (data.length - 1)) / data.length
              const x = i * (barW + barGap)

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={100 - revenueHeight}
                    width={barW * 0.45}
                    height={revenueHeight}
                    className="fill-primary/40 hover:fill-primary/60 cursor-pointer transition-colors"
                    rx="0.3"
                    onMouseEnter={(e) => handleBarHover(e, i)}
                  />
                  <rect
                    x={x + barW * 0.5}
                    y={100 - ordersHeight}
                    width={barW * 0.45}
                    height={ordersHeight}
                    className="fill-green-500/60 hover:fill-green-500/80 cursor-pointer transition-colors"
                    rx="0.3"
                    onMouseEnter={(e) => handleBarHover(e, i)}
                  />
                </g>
              )
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && tooltip.index < dataPoints.length && (
            <TooltipCard
              point={dataPoints[tooltip.index]}
              groupBy={groupBy}
              x={tooltip.x}
              y={tooltip.y}
              change={getRevChangePercent(dataPoints[tooltip.index].revenue, tooltip.index)}
            />
          )}
        </div>

        {/* Right Y-axis: Orders */}
        <div
          className="flex flex-col justify-between text-left pl-2 shrink-0"
          style={{ width: rightAxisWidth, height: `${chartHeightPx}px` }}
        >
          <span className="text-[11px] text-green-600">{maxOrders}</span>
          <span className="text-[11px] text-green-600">{Math.round(maxOrders * 0.75)}</span>
          <span className="text-[11px] text-green-600">{Math.round(maxOrders * 0.5)}</span>
          <span className="text-[11px] text-green-600">{Math.round(maxOrders * 0.25)}</span>
          <span className="text-[11px] text-green-600">0</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex" style={{ height: "28px" }}>
        <div className="shrink-0" style={{ width: leftAxisWidth }} />
        <div className="flex-1 flex">
          {data.map((item, i) => {
            const showLabel = i % labelInterval === 0 || i === data.length - 1
            if (!showLabel) return <div key={i} className="flex-1" />
            return (
              <div
                key={i}
                className="flex-1 text-center text-[11px] text-muted-foreground"
                style={{ maxWidth: `${100 / data.length * labelInterval}%` }}
              >
                {buildXLabel(item.period)}
              </div>
            )
          })}
        </div>
        <div className="shrink-0" style={{ width: rightAxisWidth }} />
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-center gap-4 pt-3 mt-2 border-t">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-3 rounded-sm bg-primary/40" />
          <span className="text-xs text-muted-foreground">
            Doanh thu: <span className="font-medium text-foreground">{formatCurrency(totalRevenue)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-3 rounded-sm bg-green-500/60" />
          <span className="text-xs text-muted-foreground">
            Số đơn: <span className="font-medium text-green-600">{totalOrders} đơn</span>
          </span>
        </div>
        {groupBy === "day" && data.length > 1 && (
          <div className="text-xs text-muted-foreground">
            TB/ngày: <span className="font-medium">{formatCurrency(Math.round(totalRevenue / data.length))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Tooltip Card =====
function TooltipCard({
  point,
  groupBy,
  x,
  y,
  change,
}: {
  point: DataPoint
  groupBy: "day" | "week" | "month"
  x: number
  y: number
  change?: number
}) {
  const isPositive = change !== undefined && change >= 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-l border-b"
        style={{
          bottom: "-5px",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
        }}
      />

      {/* Card */}
      <div
        className="rounded-xl shadow-lg p-4 border"
        style={{
          minWidth: "200px",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
        }}
      >
        {/* Date title */}
        {groupBy === "day" && (
          <p className="text-sm font-semibold text-foreground mb-3 pb-2.5 border-b">
            {point.label}
          </p>
        )}
        {groupBy === "week" && (
          <div className="mb-3 pb-2.5 border-b">
            <p className="text-sm font-semibold text-foreground">{point.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {point.startDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              {" - "}
              {point.endDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          </div>
        )}
        {groupBy === "month" && (
          <p className="text-sm font-semibold text-foreground mb-3 pb-2.5 border-b">
            {point.label}
          </p>
        )}

        {/* Metrics */}
        <div className="space-y-2.5">
          {/* Revenue */}
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-primary/40 shrink-0" />
              Doanh thu
            </span>
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
              {formatCurrency(point.revenue)}
            </span>
          </div>

          {/* Orders */}
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-green-500/60 shrink-0" />
              Số đơn
            </span>
            <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
              {point.orders} đơn
            </span>
          </div>

          {/* Average Order Value */}
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-muted-foreground">GTB/đơn</span>
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
              {point.orders > 0 ? formatCurrency(point.avgOrderValue) : "—"}
            </span>
          </div>

          {/* Change vs previous */}
          {change !== undefined && (
            <div className="flex items-center justify-between gap-6 pt-2 mt-1 border-t">
              <span className="text-xs text-muted-foreground">So với kỳ trước</span>
              <span
                className={cn(
                  "text-xs font-semibold whitespace-nowrap",
                  isPositive && "text-green-600",
                  isNegative && "text-red-600",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}
              >
                {isPositive && "+"}{change}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Calendar Picker =====
function CalendarPicker({
  from,
  to,
  onSelect,
}: {
  from: string
  to: string
  onSelect: (from: string, to: string) => void
}) {
  const [viewMonth, setViewMonth] = React.useState(() => {
    if (from) return new Date(from)
    return new Date()
  })

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
  const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1
  const days = monthEnd.getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null)

  const isInRange = (date: Date) => {
    if (!fromDate) return false
    const endDate = toDate || hoverDate
    if (!endDate) return false
    const start = fromDate < endDate ? fromDate : endDate
    const end = fromDate < endDate ? endDate : fromDate
    return date >= start && date <= end
  }

  const handleDateClick = (date: Date) => {
    if (date > today) return
    const dateStr = toDateInputString(date)
    if (!from || (from && to)) {
      onSelect(dateStr, "")
    } else {
      const f = new Date(from)
      if (date < f) {
        onSelect(dateStr, from)
      } else {
        onSelect(from, dateStr)
      }
    }
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium">
          Tháng {viewMonth.getMonth() + 1}/{viewMonth.getFullYear()}
        </p>
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <div key={d} className="h-6 flex items-center justify-center font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const dateStr = toDateInputString(date)
          const isFrom = from === dateStr
          const isTo = to === dateStr
          const isToday = date.getTime() === today.getTime()
          const inRange = isInRange(date)
          const isFuture = date > today

          return (
            <button
              key={i}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              disabled={isFuture}
              className={cn(
                "h-8 text-xs rounded transition-colors",
                isFuture && "text-muted-foreground/40 cursor-not-allowed",
                !isFuture && "hover:bg-primary/20",
                inRange && !isFrom && !isTo && "bg-primary/10",
                (isFrom || isTo) && "bg-primary text-primary-foreground hover:bg-primary",
                isToday && !isFrom && !isTo && "border border-primary"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ===== Empty State =====
function EmptyChartState() {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <BarChart3 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-sm mb-1">Chưa đủ dữ liệu thống kê</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">
        Hệ thống sẽ hiển thị doanh thu sau khi có đơn hàng đầu tiên.
      </p>
      <div className="flex items-center gap-2">
        <Link href="/seller/products">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Xem sản phẩm
          </Button>
        </Link>
        <Link href="/seller/products/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Tạo sản phẩm
          </Button>
        </Link>
      </div>
    </div>
  )
}
