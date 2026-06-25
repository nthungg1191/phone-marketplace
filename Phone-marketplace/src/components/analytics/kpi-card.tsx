"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type KPICardProps = {
  label: string
  value: string | number
  icon?: React.ReactNode
  /** Percent change vs previous period. Positive = growth. */
  changePct?: number
  /** Optional formatter for the value. */
  formatValue?: (v: number | string) => string
  /** Optional sub-label (e.g. "vs 30 ngày trước"). */
  changeLabel?: string
  loading?: boolean
}

export function KPICard({
  label,
  value,
  icon,
  changePct,
  changeLabel,
  loading,
}: KPICardProps) {
  const hasChange = typeof changePct === "number" && !isNaN(changePct)
  const isUp = hasChange && (changePct as number) > 0
  const isDown = hasChange && (changePct as number) < 0
  const TrendIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <div className="text-2xl font-bold">
              {loading ? (
                <span className="inline-block h-7 w-24 bg-muted animate-pulse rounded" />
              ) : (
                value
              )}
            </div>
          </div>
          {icon ? (
            <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          ) : null}
        </div>
        {hasChange ? (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <TrendIcon
              className={cn(
                "h-3 w-3",
                isUp && "text-emerald-600",
                isDown && "text-red-500",
                !isUp && !isDown && "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "font-medium",
                isUp && "text-emerald-600",
                isDown && "text-red-500",
                !isUp && !isDown && "text-muted-foreground"
              )}
            >
              {Math.abs(changePct as number).toFixed(1)}%
            </span>
            {changeLabel ? (
              <span className="text-muted-foreground">{changeLabel}</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}