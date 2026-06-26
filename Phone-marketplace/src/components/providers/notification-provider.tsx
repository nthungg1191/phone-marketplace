"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useUnreadNotifications } from "@/hooks/use-unread-notifications"

interface NotificationContextValue {
  unreadCount: number
  loading: boolean
  decrement: (n?: number) => void
  reset: () => void
  refresh: () => void
  notifyUpdated: () => void
}

const NOOP = () => {}

const defaultValue: NotificationContextValue = {
  unreadCount: 0,
  loading: false,
  decrement: NOOP,
  reset: NOOP,
  refresh: NOOP,
  notifyUpdated: NOOP,
}

const NotificationContext = React.createContext<NotificationContextValue>(defaultValue)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const enabled = status === "authenticated"

  const { count, loading, decrement, reset, refresh } = useUnreadNotifications({
    enabled,
    intervalMs: 30000,
  })

  const notifyUpdated = React.useCallback(() => {
    refresh()
  }, [refresh])

  const value = React.useMemo(
    () => ({
      unreadCount: count,
      loading,
      decrement,
      reset,
      refresh,
      notifyUpdated,
    }),
    [count, loading, decrement, reset, refresh, notifyUpdated]
  )

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  return React.useContext(NotificationContext)
}