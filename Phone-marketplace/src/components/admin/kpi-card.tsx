"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TrendDirection = "up" | "down" | "neutral"

interface KPICardProps {
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  previousValue?: number | string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  format?: "number" | "currency" | "percent" | "custom"
  className?: string
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  previousValue,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-100",
  format = "number",
  className,
}: KPICardProps) {
  // Determine trend direction
  const getTrendDirection = (): TrendDirection => {
    if (change === undefined || change === 0) return "neutral"
    return change > 0 ? "up" : "down"
  }

  const trend = getTrendDirection()

  // Format the value based on format type
  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val
    switch (format) {
      case "currency":
        if (val >= 1000000000) {
          return `${(val / 1000000000).toFixed(1)}B`
        }
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`
        }
        if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`
        }
        return val.toLocaleString("vi-VN")
      case "percent":
        return `${val.toFixed(1)}%`
      case "number":
      default:
        return val.toLocaleString("vi-VN")
    }
  }

  // Format previous value for comparison display
  const formatPreviousValue = (val: number | string | undefined): string => {
    if (val === undefined) return ""
    if (typeof val === "string") return val
    switch (format) {
      case "currency":
        if (val >= 1000000000) {
          return `${(val / 1000000000).toFixed(1)}B`
        }
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`
        }
        return `${(val / 1000).toFixed(1)}K`
      case "percent":
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString("vi-VN")
    }
  }

  // Get trend colors
  const getTrendColors = () => {
    switch (trend) {
      case "up":
        return {
          bg: "bg-green-50",
          text: "text-green-600",
          icon: TrendingUp,
          iconClass: "h-3 w-3",
        }
      case "down":
        return {
          bg: "bg-red-50",
          text: "text-red-600",
          icon: TrendingDown,
          iconClass: "h-3 w-3",
        }
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-500",
          icon: Minus,
          iconClass: "h-3 w-3",
        }
    }
  }

  const trendColors = getTrendColors()
  const TrendIcon = trendColors.icon

  return (
    <Card className={cn("border-0 shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {format === "currency" ? (
                <>
                  {formatValue(value)}
                  <span className="text-base font-medium ml-0.5">₫</span>
                </>
              ) : (
                formatValue(value)
              )}
            </p>

            {/* Trend Badge */}
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    trendColors.bg,
                    trendColors.text
                  )}
                >
                  <TrendIcon className={trendColors.iconClass} />
                  {change > 0 && "+"}
                  {change.toFixed(1)}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-muted-foreground">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}

            {/* Previous Value Comparison */}
            {previousValue !== undefined && previousValue !== "" && (
              <p className="text-xs text-muted-foreground mt-1">
                So với: {formatPreviousValue(previousValue)}
                {format === "currency" && "₫"}
              </p>
            )}
          </div>

          {/* Icon */}
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              iconBgColor
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
