"use client"

import * as React from "react"
import Link from "next/link"
import {
  Store,
  ShoppingBag,
  Package,
  RotateCcw,
  UserPlus,
  Check,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Activity {
  id: string
  type: ActivityType
  title: string
  description?: string
  timestamp: Date
  metadata?: Record<string, string | number | boolean>
  link?: string
}

type ActivityType =
  | "SELLER_REGISTER"
  | "SELLER_APPROVED"
  | "SELLER_REJECTED"
  | "ORDER_CREATED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "PRODUCT_APPROVED"
  | "PRODUCT_REJECTED"
  | "REFUND_REQUESTED"
  | "REFUND_APPROVED"
  | "USER_REGISTERED"
  | "COMPLAINT_CREATED"
  | "VIOLATION_REPORTED"

interface ActivityFeedProps {
  activities: Activity[]
  maxItems?: number
  showViewAll?: boolean
  className?: string
}

const activityConfig: Record<
  ActivityType,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    label: string
  }
> = {
  SELLER_REGISTER: {
    icon: Store,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Đăng ký Seller",
  },
  SELLER_APPROVED: {
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Duyệt Seller",
  },
  SELLER_REJECTED: {
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Từ chối Seller",
  },
  ORDER_CREATED: {
    icon: ShoppingBag,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Đơn hàng mới",
  },
  ORDER_COMPLETED: {
    icon: ShoppingBag,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Hoàn thành đơn",
  },
  ORDER_CANCELLED: {
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Hủy đơn",
  },
  PRODUCT_APPROVED: {
    icon: Package,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Duyệt sản phẩm",
  },
  PRODUCT_REJECTED: {
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Từ chối sản phẩm",
  },
  REFUND_REQUESTED: {
    icon: RotateCcw,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Yêu cầu hoàn tiền",
  },
  REFUND_APPROVED: {
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Duyệt hoàn tiền",
  },
  USER_REGISTERED: {
    icon: UserPlus,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Người dùng mới",
  },
  COMPLAINT_CREATED: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Khiếu nại mới",
  },
  VIOLATION_REPORTED: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Báo cáo vi phạm",
  },
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Vừa xong"
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
}

export function ActivityFeed({
  activities,
  maxItems = 8,
  showViewAll = true,
  className,
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems)

  if (activities.length === 0) {
    return (
      <Card className={cn("border-0 shadow-sm", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">📊</span>
            Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Chưa có hoạt động nào
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            Hoạt động gần đây
          </span>
          {showViewAll && (
            <Link href="/admin/activity">
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {displayedActivities.map((activity, index) => {
            const config = activityConfig[activity.type]
            const Icon = config?.icon || AlertCircle

            return (
              <div
                key={activity.id}
                className="group relative flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Timeline dot */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      config?.bgColor || "bg-gray-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        config?.color || "text-gray-600"
                      )}
                    />
                  </div>
                  {index < displayedActivities.length - 1 && (
                    <div className="w-px h-full min-h-[20px] bg-border mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-1">
                      {activity.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  {activity.metadata && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(activity.metadata)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" • ")}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Demo data generator for testing
export function generateDemoActivities(): Activity[] {
  const now = new Date()
  return [
    {
      id: "1",
      type: "SELLER_REGISTER",
      title: "Shop Minh Phone đăng ký Seller",
      description: "Cửa hàng điện thoại uy tín",
      timestamp: new Date(now.getTime() - 10 * 60 * 1000),
    },
    {
      id: "2",
      type: "ORDER_COMPLETED",
      title: "Đơn hàng #ORD-2024-1234 hoàn thành",
      description: "2.5M ₫",
      timestamp: new Date(now.getTime() - 25 * 60 * 1000),
      metadata: { amount: "2.500.000₫", items: 2 },
    },
    {
      id: "3",
      type: "PRODUCT_APPROVED",
      title: 'Sản phẩm "iPhone 15 Pro Max" được duyệt',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000),
    },
    {
      id: "4",
      type: "REFUND_REQUESTED",
      title: "Yêu cầu hoàn tiền #RET-567",
      description: "Chờ duyệt",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: "5",
      type: "USER_REGISTERED",
      title: "Người dùng mới: Nguyễn Văn A",
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    {
      id: "6",
      type: "SELLER_APPROVED",
      title: "Seller TechG3 Store được duyệt",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      id: "7",
      type: "ORDER_CREATED",
      title: "Đơn hàng mới #ORD-2024-1235",
      description: "890K ₫",
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    },
    {
      id: "8",
      type: "VIOLATION_REPORTED",
      title: "Báo cáo vi phạm cho Shop FakeStore",
      description: "3 lượt report trong 24h",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
  ]
}
