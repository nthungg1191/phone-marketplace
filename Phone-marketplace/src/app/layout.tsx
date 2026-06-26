import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { ToastProvider } from "@/components/shared/toast"
import { LockedAccountGuard } from "@/components/providers/locked-account-guard"
import { NotificationClientProvider } from "@/components/providers/notification-client-provider"

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
    default: "HNT - Thị trường điện thoại uy tín",
    template: "%s | HNT",
  },
  description: "Mua bán điện thoại cũ uy tín với hệ thống kiểm tra chất lượng minh bạch",
  keywords: ["mua bán điện thoại", "điện thoại cũ", "smartphone", "HNT"],
  authors: [{ name: "HNT" }],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "HNT",
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
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <NotificationClientProvider>
            <ToastProvider>
              <LockedAccountGuard>
                {children}
              </LockedAccountGuard>
            </ToastProvider>
          </NotificationClientProvider>
        </SessionProvider>
      </body>
    </html>
  )
}