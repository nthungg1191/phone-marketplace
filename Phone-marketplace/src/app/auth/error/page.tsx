"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Home, ArrowLeft } from "lucide-react"

const errorMessages: Record<string, string> = {
  Configuration: "Cấu hình server không hợp lệ",
  AccessDenied: "Bạn không có quyền truy cập trang này",
  Verification: "Link xác thực đã hết hạn hoặc đã được sử dụng",
  Default: "Đã xảy ra lỗi không xác định",
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Đăng nhập thất bại</CardTitle>
          <CardDescription>
            Đã xảy ra lỗi trong quá trình xác thực
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-center">{message}</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại trang đăng nhập
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Về trang chủ
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}