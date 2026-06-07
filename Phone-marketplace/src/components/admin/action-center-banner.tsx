"use client"

import * as React from "react"
import Link from "next/link"
import {
  Store,
  Package,
  RotateCcw,
  MessageSquareWarning,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TaskItem {
  label: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  bgColor: string
  borderColor: string
}

interface ActionCenterBannerProps {
  pendingSellers?: number
  pendingProducts?: number
  pendingReturns?: number
  pendingComplaints?: number
  pendingViolations?: number
  className?: string
}

export function ActionCenterBanner({
  pendingSellers = 0,
  pendingProducts = 0,
  pendingReturns = 0,
  pendingComplaints = 0,
  pendingViolations = 0,
  className,
}: ActionCenterBannerProps) {
  const totalTasks = pendingSellers + pendingProducts + pendingReturns + pendingComplaints + pendingViolations

  const tasks: TaskItem[] = [
    {
      label: "Seller chờ duyệt",
      count: pendingSellers,
      icon: Store,
      href: "/admin/sellers",
      color: "text-orange-600",
      bgColor: "bg-orange-50 hover:bg-orange-100",
      borderColor: "border-orange-200",
    },
    {
      label: "Sản phẩm chờ duyệt",
      count: pendingProducts,
      icon: Package,
      href: "/admin/products?status=PENDING",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 hover:bg-yellow-100",
      borderColor: "border-yellow-200",
    },
    {
      label: "Hoàn tiền chờ duyệt",
      count: pendingReturns,
      icon: RotateCcw,
      href: "/admin/orders?status=RETURN_PENDING",
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
      borderColor: "border-blue-200",
    },
    {
      label: "Khiếu nại",
      count: pendingComplaints,
      icon: MessageSquareWarning,
      href: "/admin/complaints",
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
      borderColor: "border-purple-200",
    },
    {
      label: "Báo cáo vi phạm",
      count: pendingViolations,
      icon: AlertTriangle,
      href: "/admin/violations",
      color: "text-red-600",
      bgColor: "bg-red-50 hover:bg-red-100",
      borderColor: "border-red-200",
    },
  ]

  // Only show tasks with count > 0
  const activeTasks = tasks.filter((task) => task.count > 0)

  if (activeTasks.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-red-700">
          Cần xử lý hôm nay
        </h2>
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
          {totalTasks}
        </span>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {activeTasks.map((task) => {
          const Icon = task.icon
          return (
            <Link key={task.href} href={task.href} className="block">
              <Card
                className={cn(
                  "border transition-all duration-200 cursor-pointer group",
                  task.bgColor,
                  task.borderColor
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        task.color.replace("text-", "bg-").concat("/20")
                      )}
                    >
                      <Icon className={cn("h-6 w-6", task.color)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700 line-clamp-1">
                        {task.label}
                      </p>
                      <p className={cn("text-2xl font-bold", task.color)}>
                        {task.count}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Xem ngay</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
