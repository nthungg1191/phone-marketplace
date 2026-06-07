"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Activity,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  Store,
  ShoppingBag,
  Package,
  UserCheck,
  UserX,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Check,
  X,
  Clock,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"

// Types
interface ActivityItem {
  id: string
  type: string
  title: string
  description?: string
  timestamp: string
  user?: string
  metadata?: Record<string, unknown>
}

type ActivityFilter = "all" | "sellers" | "orders" | "products" | "users" | "system"

const activityTypes: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  SELLER_REGISTER: { icon: "🏪", color: "text-orange-600", bgColor: "bg-orange-100", label: "Đăng ký Seller" },
  SELLER_APPROVED: { icon: "✅", color: "text-green-600", bgColor: "bg-green-100", label: "Duyệt Seller" },
  SELLER_REJECTED: { icon: "❌", color: "text-red-600", bgColor: "bg-red-100", label: "Từ chối Seller" },
  ORDER_CREATED: { icon: "🛒", color: "text-blue-600", bgColor: "bg-blue-100", label: "Tạo đơn hàng" },
  ORDER_COMPLETED: { icon: "✅", color: "text-green-600", bgColor: "bg-green-100", label: "Hoàn thành đơn" },
  ORDER_CANCELLED: { icon: "❌", color: "text-red-600", bgColor: "bg-red-100", label: "Hủy đơn hàng" },
  ORDER_SHIPPING: { icon: "🚚", color: "text-purple-600", bgColor: "bg-purple-100", label: "Đang giao hàng" },
  PRODUCT_APPROVED: { icon: "📦", color: "text-green-600", bgColor: "bg-green-100", label: "Duyệt sản phẩm" },
  PRODUCT_REJECTED: { icon: "❌", color: "text-red-600", bgColor: "bg-red-100", label: "Từ chối sản phẩm" },
  PRODUCT_CREATED: { icon: "✨", color: "text-blue-600", bgColor: "bg-blue-100", label: "Tạo sản phẩm" },
  REFUND_REQUESTED: { icon: "💰", color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Yêu cầu hoàn tiền" },
  REFUND_APPROVED: { icon: "✅", color: "text-green-600", bgColor: "bg-green-100", label: "Duyệt hoàn tiền" },
  REFUND_REJECTED: { icon: "❌", color: "text-red-600", bgColor: "bg-red-100", label: "Từ chối hoàn tiền" },
  USER_REGISTERED: { icon: "👤", color: "text-purple-600", bgColor: "bg-purple-100", label: "Đăng ký tài khoản" },
  USER_LOGIN: { icon: "🔐", color: "text-blue-600", bgColor: "bg-blue-100", label: "Đăng nhập" },
  COMPLAINT_CREATED: { icon: "📋", color: "text-red-600", bgColor: "bg-red-100", label: "Tạo khiếu nại" },
  COMPLAINT_RESOLVED: { icon: "✅", color: "text-green-600", bgColor: "bg-green-100", label: "Giải quyết khiếu nại" },
  VIOLATION_REPORTED: { icon: "⚠️", color: "text-red-600", bgColor: "bg-red-100", label: "Báo cáo vi phạm" },
  VIOLATION_RESOLVED: { icon: "✅", color: "text-green-600", bgColor: "bg-green-100", label: "Xử lý vi phạm" },
  REVIEW_CREATED: { icon: "⭐", color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Đánh giá sản phẩm" },
}

const filterOptions: { key: ActivityFilter; label: string; icon: string }[] = [
  { key: "all", label: "Tất cả", icon: "📋" },
  { key: "sellers", label: "Sellers", icon: "🏪" },
  { key: "orders", label: "Đơn hàng", icon: "🛒" },
  { key: "products", label: "Sản phẩm", icon: "📦" },
  { key: "users", label: "Người dùng", icon: "👥" },
  { key: "system", label: "Hệ thống", icon: "⚙️" },
]

export default function AdminActivityPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [filter, setFilter] = React.useState<ActivityFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/activity")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  // Generate mock activities
  React.useEffect(() => {
    const mockActivities: ActivityItem[] = [
      { id: "1", type: "SELLER_REGISTER", title: "Nguyễn Văn A đăng ký làm Seller", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: "2", type: "ORDER_COMPLETED", title: "Đơn hàng #12345 hoàn thành", description: "2.500.000đ", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: "3", type: "PRODUCT_APPROVED", title: "Sản phẩm iPhone 15 Pro Max được duyệt", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: "4", type: "SELLER_APPROVED", title: "Shop Điện thoại ABC được duyệt", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { id: "5", type: "ORDER_CANCELLED", title: "Đơn hàng #12340 bị hủy bởi người dùng", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
      { id: "6", type: "REFUND_REQUESTED", title: "Yêu cầu hoàn tiền cho đơn #12338", timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
      { id: "7", type: "USER_REGISTERED", title: "Trần Thị B đăng ký tài khoản mới", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
      { id: "8", type: "PRODUCT_REJECTED", title: "Sản phẩm không đạt yêu cầu bị từ chối", timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString() },
      { id: "9", type: "ORDER_SHIPPING", title: "Đơn hàng #12342 đang được giao", timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
      { id: "10", type: "SELLER_REJECTED", title: "Shop không đạt yêu cầu bị từ chối", timestamp: new Date(Date.now() - 1000 * 60 * 210).toISOString() },
      { id: "11", type: "COMPLAINT_CREATED", title: "Khiếu nại mới từ người dùng", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
      { id: "12", type: "REFUND_APPROVED", title: "Hoàn tiền 1.200.000đ được duyệt", timestamp: new Date(Date.now() - 1000 * 60 * 270).toISOString() },
      { id: "13", type: "PRODUCT_CREATED", title: "Samsung Galaxy S24 được thêm mới", timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
      { id: "14", type: "ORDER_CREATED", title: "Đơn hàng mới #12346", description: "5.800.000đ", timestamp: new Date(Date.now() - 1000 * 60 * 330).toISOString() },
      { id: "15", type: "VIOLATION_REPORTED", title: "Báo cáo vi phạm mới được gửi", timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
    ]
    setActivities(mockActivities)
    setLoading(false)
  }, [])

  const filteredActivities = activities.filter((activity) => {
    // Apply type filter
    if (filter !== "all") {
      const typeMap: Record<ActivityFilter, string[]> = {
        all: [],
        sellers: ["SELLER_REGISTER", "SELLER_APPROVED", "SELLER_REJECTED"],
        orders: ["ORDER_CREATED", "ORDER_COMPLETED", "ORDER_CANCELLED", "ORDER_SHIPPING", "REFUND_REQUESTED", "REFUND_APPROVED", "REFUND_REJECTED"],
        products: ["PRODUCT_APPROVED", "PRODUCT_REJECTED", "PRODUCT_CREATED"],
        users: ["USER_REGISTERED", "USER_LOGIN"],
        system: ["COMPLAINT_CREATED", "COMPLAINT_RESOLVED", "VIOLATION_REPORTED", "VIOLATION_RESOLVED", "REVIEW_CREATED"],
      }
      if (!typeMap[filter].includes(activity.type)) return false
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        activity.title.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.type.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let key: string
    if (date.toDateString() === today.toDateString()) {
      key = "Hôm nay"
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Hôm qua"
    } else {
      key = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(activity)
    return groups
  }, {} as Record<string, ActivityItem[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7" />
            Nhật ký hoạt động
          </h1>
          <p className="text-muted-foreground">Theo dõi mọi hoạt động trên hệ thống</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm hoạt động..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                filter === option.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activities.filter(a => a.type.startsWith("SELLER")).length}</p>
                <p className="text-xs text-muted-foreground">Sellers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activities.filter(a => a.type.startsWith("ORDER")).length}</p>
                <p className="text-xs text-muted-foreground">Đơn hàng</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activities.filter(a => a.type.startsWith("PRODUCT")).length}</p>
                <p className="text-xs text-muted-foreground">Sản phẩm</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activities.filter(a => a.type.startsWith("USER")).length}</p>
                <p className="text-xs text-muted-foreground">Người dùng</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              {filteredActivities.length} hoạt động
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không có hoạt động nào</p>
              <p className="text-sm">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-semibold text-muted-foreground">{date}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-3">
                    {dateActivities.map((activity) => {
                      const config = activityTypes[activity.type] || {
                        icon: "📋",
                        color: "text-gray-600",
                        bgColor: "bg-gray-100",
                        label: "Hoạt động",
                      }
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0",
                            config.bgColor
                          )}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{activity.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                              {activity.description && (
                                <span className="text-sm text-muted-foreground">
                                  {activity.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
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
