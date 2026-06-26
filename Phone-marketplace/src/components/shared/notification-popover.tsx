"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Check, Package, MessageCircle, ShoppingBag, Star, AlertCircle, X, ChevronRight } from "lucide-react"
import { useNotificationContext } from "@/components/providers/notification-provider"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  relatedId: string
  relatedType: string
  createdAt: string
}

type TabType = "all" | "messages" | "system" | "posts"

const notificationIcons: Record<string, React.ReactNode> = {
  ORDER_CREATED: <ShoppingBag className="h-4 w-4 text-blue-500" />,
  ORDER_UPDATED: <Package className="h-4 w-4 text-green-500" />,
  MESSAGE_NEW: <MessageCircle className="h-4 w-4 text-purple-500" />,
  PRODUCT_APPROVED: <Check className="h-4 w-4 text-green-500" />,
  PRODUCT_REJECTED: <AlertCircle className="h-4 w-4 text-red-500" />,
  SELLER_APPROVED: <Star className="h-4 w-4 text-yellow-500" />,
  SELLER_REJECTED: <AlertCircle className="h-4 w-4 text-red-500" />,
  DEFAULT: <Bell className="h-4 w-4 text-gray-500" />,
}

const tabCategories: Record<TabType, string[]> = {
  all: [],
  messages: ["MESSAGE_NEW"],
  system: ["SELLER_APPROVED", "SELLER_REJECTED", "TRUST_SCORE_UPDATED"],
  posts: ["PRODUCT_APPROVED", "PRODUCT_REJECTED", "ORDER_CREATED", "ORDER_UPDATED"],
}

const tabLabels: Record<TabType, string> = {
  all: "Tất cả",
  messages: "Tin nhắn",
  system: "Hệ thống",
  posts: "Bài đăng",
}

export function NotificationPopover() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(false)
  const { unreadCount, decrement, reset, refresh: refreshUnread, notifyUpdated } = useNotificationContext()
  const [activeTab, setActiveTab] = React.useState<TabType>("all")
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Fetch notifications when popover opens
  React.useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        // Sync với server để badge đồng bộ
        if (typeof data.unreadCount === "number") {
          notifyUpdated()
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
        decrement(1)
      }
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        reset()
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const getNotificationLink = (notification: Notification) => {
    switch (notification.relatedType) {
      case "ORDER":
        return `/orders/${notification.relatedId}`
      case "CONVERSATION":
        return `/messages/${notification.relatedId}`
      case "PRODUCT":
        return `/products/${notification.relatedId}`
      default:
        return "#"
    }
  }

  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "all") {
      return notifications
    }
    const categories = tabCategories[activeTab]
    return notifications.filter((n) => categories.includes(n.type))
  }, [notifications, activeTab])

  const getTabUnreadCount = (tab: TabType) => {
    if (tab === "all") return unreadCount
    const categories = tabCategories[tab]
    return notifications.filter((n) => !n.isRead && categories.includes(n.type)).length
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Vừa xong"
    if (minutes < 60) return `${minutes}p trước`
    if (hours < 24) return `${hours}h trước`
    if (days < 7) return `${days}ngày trước`
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-background border rounded-xl shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 border-b bg-muted/30">
            {(Object.keys(tabLabels) as TabType[]).map((tab) => {
              const count = getTabUnreadCount(tab)
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {tabLabels[tab]}
                  {count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Notifications List */}
          <div className="h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2" />
                <p className="text-sm">Không có thông báo</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || notificationIcons.DEFAULT
                  return (
                    <Link
                      key={notification.id}
                      href={getNotificationLink(notification)}
                      onClick={() => {
                        if (!notification.isRead) {
                          handleMarkAsRead(notification.id)
                        }
                        setIsOpen(false)
                      }}
                      className={`flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                        {Icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!notification.isRead ? "font-medium" : ""}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-muted/30">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1 w-full p-2 text-sm text-primary hover:bg-muted rounded-lg transition-colors"
            >
              Xem tất cả thông báo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
