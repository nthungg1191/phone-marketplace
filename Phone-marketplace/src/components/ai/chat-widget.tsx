'use client'

import * as React from 'react'
import Link from 'next/link'
import { X, Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  htmlContent?: string
  createdAt: string
}

interface MessageSegment {
  type: 'text' | 'link'
  text: string
  href?: string
}

interface SuggestedAction {
  label: string
  value: string
  type: 'search' | 'compare' | 'order' | 'policy' | 'quick_reply'
}

interface ChatWidgetProps {
  className?: string
}

const WELCOME_MESSAGE = `Xin chào 👋

Tôi là AI Shopping Assistant của HNT Marketplace.

Tôi có thể giúp bạn:

• Tìm điện thoại phù hợp
• So sánh các mẫu máy
• Kiểm tra đơn hàng
• Giải đáp thanh toán
• Hướng dẫn đổi trả`

const DEFAULT_ACTIONS: SuggestedAction[] = [
  { label: 'Tìm điện thoại dưới 10 triệu', value: 'Tìm điện thoại dưới 10 triệu', type: 'search' },
  { label: 'So sánh iPhone 13 và Galaxy S23', value: 'So sánh iPhone 13 và Galaxy S23', type: 'compare' },
  { label: 'Kiểm tra đơn hàng', value: 'Kiểm tra đơn hàng của tôi', type: 'order' },
  { label: 'Chính sách đổi trả', value: 'Chính sách đổi trả như thế nào', type: 'policy' },
]

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

function parseHtmlMessage(htmlContent: string): MessageSegment[] {
  const segments = htmlContent.split(/(<a\s+href="[^"]+"[^>]*>.*?<\/a>)/g).filter(Boolean)

  return segments.flatMap((segment) => {
    const match = segment.match(/^<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>$/)
    if (match) {
      const [, href, label] = match
      return [{ type: 'link' as const, href, text: decodeHtmlEntities(label) }]
    }

    return segment
      .split('<br/>')
      .flatMap((part, index, parts) => {
        const decoded = decodeHtmlEntities(part)
        const items: MessageSegment[] = []
        if (decoded.length > 0) {
          items.push({ type: 'text', text: decoded })
        }
        if (index < parts.length - 1) {
          items.push({ type: 'text', text: '\n' })
        }
        return items
      })
  })
}

function renderMessageContent(msg: AIMessage) {
  if (!msg.htmlContent) {
    return <p className="text-sm whitespace-pre-line">{msg.content}</p>
  }

  const segments = parseHtmlMessage(msg.htmlContent)

  return (
    <div className="text-sm whitespace-pre-line break-words">
      {segments.map((segment, index) => {
        if (segment.type === 'link' && segment.href) {
          return (
            <Link
              key={`${msg.id}-${index}`}
              href={segment.href}
              className="font-medium text-blue-600 underline hover:text-blue-700"
            >
              {segment.text}
            </Link>
          )
        }

        return <React.Fragment key={`${msg.id}-${index}`}>{segment.text}</React.Fragment>
      })}
    </div>
  )
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<AIMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [suggestedActions, setSuggestedActions] = React.useState<SuggestedAction[]>(DEFAULT_ACTIONS)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Check login status
  React.useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        setIsLoggedIn(!!data?.user)
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkLogin()
  }, [])

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleOpen = () => {
    setIsOpen(true)
    if (messages.length === 0) {
      setShowLoginPrompt(true)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      return
    }

    setInput('')
    setIsLoading(true)
    setShowLoginPrompt(false)

    // Add user message
    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, conversationId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Lỗi server')
      }

      const data = await res.json()

      if (!conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMsg: AIMessage = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.message,
        htmlContent: data.htmlMessage,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      if (data.actions) {
        setSuggestedActions(data.actions)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.'
      const errorMsg: AIMessage = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: message,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
          className
        )}
      >
        <Bot className="w-5 h-5" />
        <span className="font-medium">AI Assistant</span>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </button>
    )
  }

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Shopping Assistant</h3>
            <p className="text-xs text-blue-100">HNT Marketplace</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl rounded-tl-md p-4">
              <div className="flex items-start gap-2">
                <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {WELCOME_MESSAGE}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}

            <div className={cn(
              'max-w-[80%] rounded-2xl p-3',
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-md'
                : 'bg-gray-100 text-gray-800 rounded-tl-md'
            )}>
              {msg.role === 'assistant' ? renderMessageContent(msg) : <p className="text-sm whitespace-pre-line">{msg.content}</p>}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-md p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Login prompt */}
        {showLoginPrompt && !isLoggedIn && (
          <div className="bg-amber-50 rounded-2xl rounded-tl-md p-4 border border-amber-200">
            <p className="text-sm text-amber-800">
              Vui lòng <a href="/auth/login" className="underline font-medium">đăng nhập</a> để sử dụng AI Assistant.
            </p>
          </div>
        )}

        {/* Suggested actions (after first message) */}
        {messages.length > 0 && suggestedActions.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-500 font-medium">Bạn có thể hỏi thêm</p>
            <div className="flex flex-wrap gap-2">
              {suggestedActions.slice(0, 3).map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action.value)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-100 text-gray-600 rounded-full transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Nhập tin nhắn..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none min-h-[44px] max-h-[160px] overflow-y-auto leading-relaxed"
            style={{ height: 'auto' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
