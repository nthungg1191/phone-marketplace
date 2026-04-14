import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { Header } from "@/components/shared/header"
import { Footer } from "@/components/shared/footer"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased`}
      >
        <SessionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}