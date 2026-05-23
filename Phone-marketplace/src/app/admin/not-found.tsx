"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Home, Shield } from "lucide-react"

export default function NotFound() {
  useEffect(() => {
    console.log("Admin page not found:", window.location.pathname)
  }, [])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Không tìm thấy trang</h2>
        <p className="text-muted-foreground mb-8">
          Trang quản trị bạn đang tìm kiếm không tồn tại.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/admin">
            <Button>
              <Shield className="mr-2 h-4 w-4" />
              Dashboard Admin
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
