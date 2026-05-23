"use client"

import { Header } from "@/components/shared/header"
import { Footer } from "@/components/shared/footer"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
