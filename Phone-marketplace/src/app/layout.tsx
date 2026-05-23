import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { ToastProvider } from "@/components/shared/toast"
import { LockedAccountGuard } from "@/components/providers/locked-account-guard"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "EUT Marketplace - Thị trường điện thoại uy tín",
    template: "%s | EUT Marketplace",
  },
  description: "Mua bán điện thoại cũ uy tín với hệ thống kiểm tra chất lượng minh bạch",
  keywords: ["mua bán điện thoại", "điện thoại cũ", "smartphone", "EUT Marketplace"],
  authors: [{ name: "EUT Marketplace" }],
  openGraph: {
    title: "EUT Marketplace",
    description: "Mua bán điện thoại cũ uy tín với hệ thống kiểm tra chất lượng minh bạch",
    type: "website",
    locale: "vi_VN",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ToastProvider>
            <LockedAccountGuard>
              {children}
            </LockedAccountGuard>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}