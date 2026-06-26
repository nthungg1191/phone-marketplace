"use client"

import * as React from "react"

interface UseUnreadNotificationsOptions {
  intervalMs?: number
  enabled?: boolean
}

interface UseUnreadNotificationsReturn {
  count: number
  loading: boolean
  decrement: (n?: number) => void
  reset: () => void
  refresh: () => void
}

export function useUnreadNotifications({
  intervalMs = 30000,
  enabled = true,
}: UseUnreadNotificationsOptions = {}): UseUnreadNotificationsReturn {
  const [count, setCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const fetchCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      setCount(Number(data.count) || 0)
    } catch {
      // Silent fail
    }
  }, [])

  React.useEffect(() => {
    if (!enabled) return

    setLoading(true)
    fetchCount().finally(() => setLoading(false))

    const interval = setInterval(fetchCount, intervalMs)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCount()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    const handleUpdated = () => fetchCount()
    window.addEventListener("notifications-updated", handleUpdated)
    window.addEventListener("focus", handleUpdated)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("notifications-updated", handleUpdated)
      window.removeEventListener("focus", handleUpdated)
    }
  }, [enabled, intervalMs, fetchCount])

  const decrement = React.useCallback((n = 1) => {
    setCount((prev) => Math.max(0, prev - n))
  }, [])

  const reset = React.useCallback(() => setCount(0), [])

  const refresh = React.useCallback(() => fetchCount(), [fetchCount])

  return { count, loading, decrement, reset, refresh }
}