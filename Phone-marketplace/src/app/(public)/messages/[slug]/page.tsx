"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Send, ArrowLeft, CheckCheck, Search, MoreVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/shared/breadcrumb"

interface Message {
  id: string
  content: string
  type: string
  createdAt: string
  sender: { id: string; name: string; avatar: string | null }
}

interface Conversation {
  id: string
  participants: Array<{
    user: { id: string; name: string; avatar: string | null }
  }>
  messages: Message[]
  product?: { id: string; title: string }
  lastMessageAt?: string
}

export default function MessagesPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()

  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [newMessage, setNewMessage] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const conversationId = params.slug as string
  const userId = session?.user?.id as string

  const [messages, setMessages] = React.useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = React.useState(false)

  const messageCountRef = React.useRef(0)

  const fetchMessages = React.useCallback(async (isPolling = false) => {
    if (!conversationId) return

    if (!isPolling) {
      setMessagesLoading(true)
    }

    try {
      const res = await fetch("/api/messages/" + conversationId)
      if (res.ok) {
        const data = await res.json()
        const newMessages = data.messages || []
        const currentCount = messageCountRef.current
        const newCount = newMessages.length

        setMessages(newMessages)
        messageCountRef.current = newCount

        if (newCount > currentCount && isPolling) {
          const latestMessage = newMessages[newMessages.length - 1]
          if (latestMessage && latestMessage.sender.id !== userId) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }, 100)
          }
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err)
    } finally {
      if (!isPolling) {
        setMessagesLoading(false)
      }
    }
  }, [conversationId, userId])

  React.useEffect(() => {
    if (!session) {
      router.push("/auth/login?callbackUrl=/messages")
      return
    }

    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/messages")
        if (res.ok) {
          const data = await res.json()
          setConversations(data.conversations || [])
          if (!conversationId && data.conversations?.length > 0) {
            router.push("/messages/" + data.conversations[0].id)
          }
        }
      } catch (error) {
        console.error("Error fetching conversations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [session, router, conversationId])

  React.useEffect(() => {
    if (conversationId) {
      setMessages([])
      messageCountRef.current = 0
      fetchMessages(true)

      const interval = setInterval(() => {
        fetchMessages(true)
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [conversationId, fetchMessages])

  React.useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 100)
    }
  }, [messagesLoading, messages.length])

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || sending) return

    setSending(true)
    try {
      const res = await fetch("/api/messages/" + conversationId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      if (res.ok) {
        const data = await res.json()

        // Nếu tạo cuộc trò chuyện mới (người kia đã rời)
        if (data.isNewConversation && data.conversationId) {
          // Chuyển sang cuộc trò chuyện mới
          router.push("/messages/" + data.conversationId)
          return
        }

        setMessages((prev) => [...prev, data.message])
        setNewMessage("")

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }, 50)

        const convRes = await fetch("/api/messages")
        if (convRes.ok) {
          const convData = await convRes.json()
          setConversations(convData.conversations || [])
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (!conversationId || deleting) return

    if (!confirm("Ban co chan muon xoa cuoc tro chuyen nay?")) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch("/api/messages/" + conversationId, {
        method: "DELETE",
      })

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
        const remainingConvs = conversations.filter((c) => c.id !== conversationId)
        if (remainingConvs.length > 0) {
          router.push("/messages/" + remainingConvs[0].id)
        } else {
          router.push("/messages")
        }
        setMenuOpen(false)
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    } finally {
      setDeleting(false)
    }
  }

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p.user.id !== userId)?.user || {
      name: "Nguoi dung",
      avatar: null,
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Hom nay"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hom qua"
    }
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
  }

  const selectedConv = conversations.find((c) => c.id === conversationId)
  const otherUser = selectedConv ? getOtherParticipant(selectedConv) : null

  const filteredConversations = conversations.filter((conv) => {
    const participant = getOtherParticipant(conv)
    const searchLower = searchQuery.toLowerCase()
    return (
      participant.name.toLowerCase().includes(searchLower) ||
      conv.product?.title.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex h-[calc(100vh-4rem-41px)] bg-background">
        {/* Danh sach doan hoi thoai */}
        <div className="w-80 flex-shrink-0 border-r bg-card max-md:hidden flex flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <h1 className="text-xl font-bold">Tin nhan</h1>
            <Badge variant="secondary" className="text-xs">
              {conversations.length}
            </Badge>
          </div>

          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tim kiem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">
                  {searchQuery ? "Khong tim thay cuoc tro chuyen" : "Chua co cuoc tro chuyen nao"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const participant = getOtherParticipant(conv)
                const isActive = conv.id === conversationId

                return (
                  <div
                    key={conv.id}
                    className={"relative group" + (isActive ? " bg-primary/10" : "")}
                  >
                    <button
                      onClick={() => router.push("/messages/" + conv.id)}
                      className="flex w-full items-center gap-3 border-b p-4 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                          {participant.avatar ? (
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold">
                              {participant.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-semibold">{participant.name}</span>
                          {conv.lastMessageAt && (
                            <span className="flex-shrink-0 text-xs text-muted-foreground">
                              {formatDate(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        {conv.product && (
                          <p className="truncate text-sm text-primary">
                            ve: {conv.product.title}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm("Xoa cuoc tro chuyen voi " + participant.name + "?")) {
                          try {
                            const res = await fetch("/api/messages/" + conv.id, { method: "DELETE" })
                            if (res.ok) {
                              setConversations((prev) => prev.filter((c) => c.id !== conv.id))
                              if (conv.id === conversationId) {
                                const remaining = conversations.filter((c) => c.id !== conv.id)
                                if (remaining.length > 0) {
                                  router.push("/messages/" + remaining[0].id)
                                } else {
                                  router.push("/messages")
                                }
                              }
                            }
                          } catch (err) {
                            console.error("Error deleting conversation:", err)
                          }
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-600 transition-all"
                      title="Xoa cuoc tro chuyen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Khu vuc chat */}
        <div className="flex flex-1 flex-col">
          <div className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-card px-4">
            {conversationId && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => router.push("/messages")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {otherUser ? (
              <>
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    {otherUser.avatar ? (
                      <img
                        src={otherUser.avatar}
                        alt={otherUser.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-semibold">
                        {otherUser.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <p className="truncate font-semibold">{otherUser.name}</p>
                  {selectedConv?.product && (
                    <p className="truncate text-xs text-muted-foreground">
                      ve: {selectedConv.product.title}
                    </p>
                  )}
                </div>
                <div className="ml-auto relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-50 py-1">
                        <button
                          onClick={handleDeleteConversation}
                          disabled={deleting}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleting ? "Dang xoa..." : "Xoa cuoc tro chuyen"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Chon mot cuoc tro chuyen de bat dau</p>
            )}
          </div>

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 to-background p-4"
          >
            {messagesLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Send className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm">Chua co tin nhan nao</p>
                <p className="text-xs">Bat dau cuoc tro chuyen</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isMe = message.sender.id === userId
                  const showDate =
                    index === 0 ||
                    formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt)

                  return (
                    <React.Fragment key={message.id}>
                      {showDate && (
                        <div className="flex justify-center">
                          <span className="rounded-full bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={"flex " + (isMe ? "justify-end" : "justify-start")}>
                        <div
                          className={
                            "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm " +
                            (isMe
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                              : "bg-card")
                          }
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div
                            className={
                              "mt-1 flex items-center gap-1 text-xs " +
                              (isMe ? "text-primary-foreground/70" : "text-muted-foreground")
                            }
                          >
                            <span>{formatTime(message.createdAt)}</span>
                            {isMe && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t bg-card p-4">
            <div className="flex items-center gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Nhap tin nhan..."
                disabled={!conversationId || sending}
                className="flex-1 rounded-full px-4"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || !conversationId || sending}
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
