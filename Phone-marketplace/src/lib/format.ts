// Safe number formatting utilities

/**
 * Safely parse a number, returning 0 if invalid
 */
export function safeNumber(value: number | string | null | undefined, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === "number") return isNaN(value) ? defaultValue : value
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ""))
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

/**
 * Format a number as currency (VND)
 */
export function formatCurrency(value: number | string | null | undefined, compact = false): string {
  const num = safeNumber(value)
  if (compact) {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace("₫", "đ")
}

/**
 * Format a percentage change
 */
export function formatChange(value: number | null | undefined, showSign = true): string {
  const num = safeNumber(value)
  if (isNaN(num) || !isFinite(num)) return "0%"
  const sign = showSign && num > 0 ? "+" : ""
  return `${sign}${num.toFixed(1)}%`
}

/**
 * Format a relative time (e.g., "5 phút trước")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Không rõ"
  
  const now = new Date()
  const targetDate = new Date(date)
  const diffMs = now.getTime() - targetDate.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "Vừa xong"
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  
  return targetDate.toLocaleDateString("vi-VN", { 
    day: "2-digit", 
    month: "2-digit" 
  })
}

/**
 * Get trend icon and color based on change value
 */
export function getTrendInfo(change: number | null | undefined): {
  icon: "up" | "down" | "neutral"
  color: string
  bgColor: string
  label: string
} {
  const num = safeNumber(change)
  
  if (num > 0) {
    return {
      icon: "up",
      color: "text-green-600",
      bgColor: "bg-green-50",
      label: "Tăng"
    }
  }
  if (num < 0) {
    return {
      icon: "down",
      color: "text-red-600", 
      bgColor: "bg-red-50",
      label: "Giảm"
    }
  }
  return {
    icon: "neutral",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    label: "Không đổi"
  }
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate percentage safely
 */
export function safePercentage(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0) return 0
  return (numerator / denominator) * 100
}
