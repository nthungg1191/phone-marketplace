"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, AlertCircle, Info, ArrowRight, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AlertSeverity = "HIGH" | "MEDIUM" | "LOW"

interface SystemAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description?: string
  count?: number
  timestamp?: Date | string
  link?: string
  dismissed?: boolean
}

type AlertType =
  | "SELLER_REPORTED"
  | "ANOMALY_ORDER"
  | "HIGH_REFUND_RATE"
  | "PENDING_COMPLAINTS"
  | "PENDING_VIOLATIONS"
  | "PRODUCT_SCAM"
  | "FRAUD_DETECTED"
  | "SYSTEM_WARNING"

interface SystemAlertsProps {
  alerts: SystemAlert[]
  onDismiss?: (id: string) => void
  maxItems?: number
  className?: string
}

const alertConfig: Record<
  AlertType,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    borderColor: string
    label: string
  }
> = {
  SELLER_REPORTED: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
    label: "Seller bị report",
  },
  ANOMALY_ORDER: {
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-l-orange-500",
    label: "Đơn bất thường",
  },
  HIGH_REFUND_RATE: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-l-yellow-500",
    label: "Tỷ lệ hoàn cao",
  },
  PENDING_COMPLAINTS: {
    icon: AlertCircle,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-l-purple-500",
    label: "Khiếu nại chưa xử lý",
  },
  PENDING_VIOLATIONS: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
    label: "Vi phạm chưa xử lý",
  },
  PRODUCT_SCAM: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
    label: "Nghi lừa đảo",
  },
  FRAUD_DETECTED: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
    label: "Gian lận phát hiện",
  },
  SYSTEM_WARNING: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-l-blue-500",
    label: "Cảnh báo hệ thống",
  },
}

const severityConfig: Record<
  AlertSeverity,
  { label: string; color: string; bgColor: string }
> = {
  HIGH: {
    label: "Cao",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  MEDIUM: {
    label: "Trung bình",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  LOW: {
    label: "Thấp",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
}

export function SystemAlerts({
  alerts,
  onDismiss,
  maxItems = 5,
  className,
}: SystemAlertsProps) {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set())

  const activeAlerts = alerts
    .filter((alert) => !dismissed.has(alert.id))
    .slice(0, maxItems)

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
    onDismiss?.(id)
  }

  if (activeAlerts.length === 0) {
    return (
      <Card className={cn("border-0 shadow-sm", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">🚨</span>
            Cảnh báo hệ thống
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Không có cảnh báo nào
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group alerts by severity
  const groupedAlerts = activeAlerts.reduce(
    (acc, alert) => {
      const severity = alert.severity
      if (!acc[severity]) acc[severity] = []
      acc[severity].push(alert)
      return acc
    },
    {} as Record<AlertSeverity, SystemAlert[]>
  )

  const severityOrder: AlertSeverity[] = ["HIGH", "MEDIUM", "LOW"]

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="text-lg">🚨</span>
          Cảnh báo hệ thống
          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
            {activeAlerts.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {severityOrder.map((severity) => {
            const alertsBySeverity = groupedAlerts[severity]
            if (!alertsBySeverity || alertsBySeverity.length === 0) return null

            const sevConfig = severityConfig[severity]

            return (
              <div key={severity} className="space-y-2">
                {/* Severity Label */}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      sevConfig.bgColor,
                      sevConfig.color
                    )}
                  >
                    {sevConfig.label}
                  </span>
                </div>

                {/* Alerts in this severity */}
                <div className="space-y-2">
                  {alertsBySeverity.map((alert) => {
                    const config = alertConfig[alert.type]
                    const Icon = config?.icon || AlertCircle

                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "border-l-4 p-3 rounded-r-lg transition-colors",
                          config?.bgColor || "bg-gray-50",
                          config?.borderColor || "border-l-gray-500",
                          "hover:opacity-90"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <Icon
                              className={cn(
                                "h-4 w-4 mt-0.5 shrink-0",
                                config?.color || "text-gray-600"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium line-clamp-1">
                                {alert.title}
                              </p>
                              {alert.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {alert.description}
                                </p>
                              )}
                              {alert.count !== undefined && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {alert.count} lần trong 24h
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {alert.link && (
                              <Link href={alert.link}>
                                <button className="p-1 hover:bg-black/5 rounded transition-colors">
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </Link>
                            )}
                            {onDismiss && (
                              <button
                                onClick={() => handleDismiss(alert.id)}
                                className="p-1 hover:bg-black/5 rounded transition-colors"
                              >
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
export function generateDemoAlerts(): SystemAlert[] {
  const now = new Date()
  return [
    {
      id: "1",
      type: "SELLER_REPORTED",
      severity: "HIGH",
      title: 'Seller "TechGianStore" bị report',
      description: "3 lượt report trong 24h - Nghi bán hàng giả",
      count: 3,
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      link: "/admin/sellers/tech-gian-store",
    },
    {
      id: "2",
      type: "ANOMALY_ORDER",
      severity: "MEDIUM",
      title: "5 đơn hàng bất thường detected",
      description: "Cùng IP, rapid checkout trong 5 phút",
      count: 5,
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      link: "/admin/orders?filter=anomaly",
    },
    {
      id: "3",
      type: "PENDING_VIOLATIONS",
      severity: "MEDIUM",
      title: "8 báo cáo vi phạm chưa xử lý",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      link: "/admin/violations",
    },
    {
      id: "4",
      type: "HIGH_REFUND_RATE",
      severity: "LOW",
      title: "Tỷ lệ hoàn tiền tăng 15%",
      description: "Shop PhoneG3 có tỷ lệ hoàn cao bất thường",
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      link: "/admin/orders?status=REFUNDED",
    },
    {
      id: "5",
      type: "PENDING_COMPLAINTS",
      severity: "LOW",
      title: "2 khiếu nại chưa xử lý",
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      link: "/admin/complaints",
    },
  ]
}
