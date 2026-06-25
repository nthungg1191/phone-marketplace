"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = React.useState("")
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  function validateEmail(value: string): string | null {
    if (!value.trim()) return "Vui lòng nhập email"
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(value.trim())) return "Email không hợp lệ"
    return null
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
    if (fieldError) setFieldError(null)
  }

  function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const error = validateEmail(e.target.value)
    if (error) setFieldError(error)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const error = validateEmail(email)
    if (error) {
      setFieldError(error)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || "Đã xảy ra lỗi. Vui lòng thử lại.")
        setIsLoading(false)
        return
      }

      setSuccessMessage(data.message || "Đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.")
    } catch {
      setErrorMessage("Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <Image
            src="/logo.png"
            alt="HNT"
            width={96}
            height={96}
            className="mx-auto mb-4 h-24 w-auto"
            priority
          />
          <CardTitle className="text-2xl font-bold">Quên mật khẩu?</CardTitle>
          <CardDescription>
            Không sao cả! Nhập email của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">{successMessage}</p>
              <p className="text-xs text-muted-foreground">
                Nếu không thấy email, hãy kiểm tra hộp thư spam hoặc liên hệ{" "}
                <a href="mailto:hotro.hnt@gmail.com" className="text-primary underline">
                  hotro.hnt@gmail.com
                </a>
              </p>
              <Button variant="outline" className="w-full" onClick={() => router.push("/auth/login")}>
                Quay lại đăng nhập
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Địa chỉ email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nguyenvana@example.com"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    className={`pl-10 ${fieldError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {fieldError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldError}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  "Gửi hướng dẫn"
                )}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          <p>
            Nhớ mật khẩu rồi?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Đăng nhập ngay
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
