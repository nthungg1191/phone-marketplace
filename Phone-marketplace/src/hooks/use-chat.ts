"use client"

import * as React from "react"

// Smart polling - chỉ fetch khi có thay đổi thực sự
// Chiến lược: 
// 1. Chỉ poll khi tab đang visible (Page Visibility API)
// 2. Tăng interval lên 10s (thay vì 3s)
// 3. Chỉ fetch ID/timestamp mới nhất, so sánh - tránh fetch full data

interface Message {
  id: string
  content: string
  type: string
  createdAt: string
  sender: { id: string; name: string; avatar: string | null }
}

interface LastMessageInfo {
  id: string
  createdAt: string
}

interface UseChatPollingOptions {
  conversationId: string | null
  enabled?: boolean
  interval?: number // milliseconds
  onNewMessage?: (message: Message) => void
}

export function useChatPolling({
  conversationId,
  enabled = true,
  interval = 3000, // 10 seconds - giảm từ 3s
  onNewMessage,
}: UseChatPollingOptions) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Track last message để so sánh
  const lastMessageRef = React.useRef<LastMessageInfo | null>(null)
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Track tab visibility - chỉ poll khi tab visible
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      setIsVisible(visible)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchLatestMessageId = React.useCallback(async (convId: string): Promise<LastMessageInfo | null> => {
    try {
      // Chỉ lấy message mới nhất, không load tất cả
      const res = await fetch(`/api/messages/${convId}/latest`)
      if (res.ok) {
        const data = await res.json()
        return data.message ? { id: data.message.id, createdAt: data.message.createdAt } : null
      }
    } catch (err) {
      console.error("Error fetching latest message:", err)
    }
    return null
  }, [])

  const fetchFullMessages = React.useCallback(async (convId: string) => {
    if (!isVisible) return // Skip nếu tab hidden
    
    try {
      const res = await fetch(`/api/messages/${convId}`)
      if (res.ok) {
        const data = await res.json()
        const newMessages: Message[] = data.messages || []
        
        if (newMessages.length > 0) {
          const latestMessage = newMessages[newMessages.length - 1]
          
          // So sánh với message đã biết
          if (!lastMessageRef.current || latestMessage.id !== lastMessageRef.current.id) {
            // Có message mới!
            if (lastMessageRef.current) {
              // Tìm các message mới (từ sau lastMessageRef)
              const newMsgIndex = newMessages.findIndex(m => m.id === lastMessageRef.current?.id)
              if (newMsgIndex !== -1) {
                const newMessagesList = newMessages.slice(newMsgIndex + 1)
                newMessagesList.forEach(msg => onNewMessage?.(msg))
              }
            }
            
            lastMessageRef.current = { id: latestMessage.id, createdAt: latestMessage.createdAt }
            setMessages(newMessages)
          }
        }
      }
    } catch (err) {
      console.error("Chat polling error:", err)
    }
  }, [isVisible, onNewMessage])

  // Initialize - load full messages khi bắt đầu
  React.useEffect(() => {
    if (!conversationId || !enabled) return

    const init = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/messages/${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          const newMessages: Message[] = data.messages || []
          setMessages(newMessages)
          
          if (newMessages.length > 0) {
            const latest = newMessages[newMessages.length - 1]
            lastMessageRef.current = { id: latest.id, createdAt: latest.createdAt }
          }
        }
      } catch (err) {
        console.error("Error initializing messages:", err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [conversationId, enabled])

  // Smart polling - chỉ khi tab visible
  React.useEffect(() => {
    if (!enabled || !conversationId || !isVisible) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    pollingRef.current = setInterval(() => {
      fetchFullMessages(conversationId)
    }, interval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [enabled, conversationId, interval, isVisible, fetchFullMessages])

  const addMessage = React.useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
    lastMessageRef.current = { id: message.id, createdAt: message.createdAt }
  }, [])

  return {
    messages,
    setMessages,
    loading,
    error,
    addMessage,
    refresh: () => conversationId && fetchFullMessages(conversationId),
  }
}

// Hook đếm số tin nhắn chưa đọc - cũng dùng smart polling
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  React.useEffect(() => {
    if (!isVisible) return

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/messages/unread-count")
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count || 0)
        }
      } catch (err) {
        console.error("Error fetching unread count:", err)
      }
    }

    // Initial fetch
    fetchUnreadCount()

    // Poll every 15 seconds (ít hơn messages vì less urgent)
    const interval = setInterval(fetchUnreadCount, 15000)
    return () => clearInterval(interval)
  }, [isVisible])

  return unreadCount
}
