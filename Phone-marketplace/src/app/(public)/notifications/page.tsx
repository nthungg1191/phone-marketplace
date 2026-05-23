"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Bell, Check, CheckCheck, Package, MessageCircle, ShoppingBag, Star, AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumb } from "@/components/shared/breadcrumb"

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
  ORDER_CREATED: <ShoppingBag className="h-5 w-5 text-blue-500" />,
  ORDER_UPDATED: <Package className="h-5 w-5 text-green-500" />,
  MESSAGE_NEW: <MessageCircle className="h-5 w-5 text-purple-500" />,
  PRODUCT_APPROVED: <Check className="h-5 w-5 text-green-500" />,
  PRODUCT_REJECTED: <AlertCircle className="h-5 w-5 text-red-500" />,
  SELLER_APPROVED: <Star className="h-5 w-5 text-yellow-500" />,
  SELLER_REJECTED: <AlertCircle className="h-5 w-5 text-red-500" />,
  DEFAULT: <Bell className="h-5 w-5 text-gray-500" />,
}

// Phân loại notification theo tabs
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

export default function NotificationsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState<TabType>("all")

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/notifications")
      return
    }

    if (status === "authenticated") {
      fetchNotifications()
    }
  }, [status, router])

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      if (notificationId) {
        const res = await fetch("/api/notifications/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        })
        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
          )
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
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
        setUnreadCount(0)
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

  // Filter notifications theo tab
  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "all") {
      return notifications
    }
    const categories = tabCategories[activeTab]
    return notifications.filter((n) => categories.includes(n.type))
  }, [notifications, activeTab])

  // Count unread cho mỗi tab
  const getTabUnreadCount = (tab: TabType) => {
    if (tab === "all") return unreadCount
    const categories = tabCategories[tab]
    return notifications.filter((n) => !n.isRead && categories.includes(n.type)).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Thông báo" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Thông báo</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(Object.keys(tabLabels) as TabType[]).map((tab) => {
            const count = getTabUnreadCount(tab)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted"
                }`}
              >
                <span>{tabLabels[tab]}</span>
                {count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab
                        ? "bg-primary-foreground/20"
                        : "bg-primary/10"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Không có thông báo nào</h2>
              <p className="text-muted-foreground">
                {activeTab === "all"
                  ? "Khi có thông báo mới, bạn sẽ thấy ở đây"
                  : `Chưa có thông báo ${tabLabels[activeTab].toLowerCase()} nào`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || notificationIcons.DEFAULT
              return (
                <Card
                  key={notification.id}
                  className={notification.isRead ? "" : "border-l-4 border-l-primary"}
                >
                  <CardContent className="p-4">
                    <Link
                      href={getNotificationLink(notification)}
                      onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                      className="flex items-start gap-4"
                    >
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0">
                        {Icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
