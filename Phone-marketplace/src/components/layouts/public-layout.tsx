"use client"

import { Header } from "@/components/shared/header"
import { Footer } from "@/components/shared/footer"
import { ChatWidget } from "@/components/ai/chat-widget"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <ChatWidget />
    </>
  )
}
