"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartDataPoint {
  date: string
  label: string
  orders: number
  revenue: number
}

interface RevenueChartProps {
  data: ChartDataPoint[]
  period?: "7d" | "30d"
  onPeriodChange?: (period: "7d" | "30d") => void
  className?: string
}

export function RevenueChart({
  data,
  period = "7d",
  onPeriodChange,
  className,
}: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <p className="text-muted-foreground">Không có dữ liệu</p>
      </div>
    )
  }

  // Calculate totals
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Find max values for scaling
  const maxOrders = Math.max(...data.map((d) => d.orders), 1)
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  // Chart dimensions
  const chartWidth = 100 // percentage

  // Format currency for display
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Doanh thu & Đơn hàng</h3>
        {onPeriodChange && (
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => onPeriodChange("7d")}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                period === "7d"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              7 ngày
            </button>
            <button
              onClick={() => onPeriodChange("30d")}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                period === "30d"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              30 ngày
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Tổng đơn: </span>
          <span className="font-semibold">{totalOrders.toLocaleString("vi-VN")}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Doanh thu: </span>
          <span className="font-semibold text-green-600">
            {totalRevenue.toLocaleString("vi-VN")}₫
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">TB/đơn: </span>
          <span className="font-semibold">
            {avgOrderValue.toLocaleString("vi-VN")}₫
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Legend */}
        <div className="flex items-center gap-4 text-sm mb-2">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Đơn hàng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Doanh thu</span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-1 h-40">
          {data.map((point, index) => {
            const ordersHeight = (point.orders / maxOrders) * 100
            const revenueHeight = (point.revenue / maxRevenue) * 100

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap -translate-y-8">
                  <div className="font-medium">{point.label}</div>
                  <div>{point.orders} đơn</div>
                  <div>{point.revenue.toLocaleString("vi-VN")}₫</div>
                </div>

                {/* Bars Container */}
                <div className="w-full h-32 flex items-end gap-px">
                  {/* Orders Bar */}
                  <div
                    className="flex-1 bg-primary/30 hover:bg-primary/40 transition-colors rounded-t"
                    style={{ height: `${Math.max(ordersHeight, 5)}%` }}
                    title={`${point.orders} đơn`}
                  />
                  {/* Revenue Bar */}
                  <div
                    className="flex-1 bg-green-500/70 hover:bg-green-500 transition-colors rounded-t"
                    style={{ height: `${Math.max(revenueHeight, 5)}%` }}
                    title={`${point.revenue.toLocaleString("vi-VN")}₫`}
                  />
                </div>
                {/* Date Label */}
                <span className="text-xs text-muted-foreground mt-1">
                  {point.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Sparkline component for KPI cards
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({
  data,
  width = 60,
  height = 24,
  color = "currentColor",
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  })

  const pathD = `M ${points.join(" L ")}`

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
