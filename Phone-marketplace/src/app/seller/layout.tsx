"use client"

import { SellerLayout } from "@/components/layouts/seller-layout"

export default function SellerGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SellerLayout>{children}</SellerLayout>
}
