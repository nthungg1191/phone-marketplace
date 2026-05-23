"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { MessageCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Conversation {
  id: string
  participants: Array<{
    user: { id: string; name: string; avatar: string | null }
  }>
  messages: Array<{
    id: string
    content: string
    createdAt: string
  }>
  product?: { id: string; title: string }
  lastMessageAt?: string
}

export default function MessagesIndexPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/messages")
      return
    }

    if (status === "authenticated") {
      fetchConversations()
    }
  }, [status, router])

  // Redirect to first conversation on desktop (only if not already on a conversation page)
  React.useEffect(() => {
    if (conversations.length > 0 && window.innerWidth >= 768 && !window.location.pathname.includes("/messages/")) {
      router.replace(`/messages/${conversations[0].id}`)
    }
  }, [conversations.length, router])

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages")
      if (res.ok) {
        const data = await res.json()
        const convs = data.conversations || []
        setConversations(convs)
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p.user.id !== session?.user?.id)?.user
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Tin nhắn</h1>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Chưa có cuộc trò chuyện nào</h3>
              <p className="text-muted-foreground mb-4">
                Bắt đầu trò chuyện với người bán khi xem sản phẩm
              </p>
              <Link href="/products">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Khám phá sản phẩm
                </button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {conversations.map((conv) => {
              const other = getOtherParticipant(conv)
              const lastMessage = conv.messages[0]

              return (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/messages/${conv.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        {other?.avatar ? (
                          <img
                            src={other.avatar}
                            alt={other.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-primary">
                            {other?.name?.charAt(0) || "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{other?.name || "Người dùng"}</p>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                        {conv.product && (
                          <p className="text-sm text-primary truncate">
                            {conv.product.title}
                          </p>
                        )}
                        {lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
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
