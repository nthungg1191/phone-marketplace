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
import { Loader2, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"

interface PageProps {
  params: Promise<{ token: string }>
}

function ResetPasswordContent({ token }: { token: string }) {
  const router = useRouter()

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [isValidating, setIsValidating] = React.useState(true)
  const [tokenError, setTokenError] = React.useState<string | null>(null)

  // Validate token on mount
  React.useEffect(() => {
    if (!token) {
      setTokenError("Liên kết không hợp lệ.")
      setIsValidating(false)
    } else {
      setIsValidating(false)
    }
  }, [token])

  function validateField(name: string, value: string): string | null {
    switch (name) {
      case "password":
        if (!value) return "Vui lòng nhập mật khẩu mới"
        if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự"
        return null
      case "confirmPassword":
        if (!value) return "Vui lòng xác nhận mật khẩu"
        if (value !== password) return "Mật khẩu xác nhận không khớp"
        return null
      default:
        return null
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const nameMap: Record<string, string> = {
      passwordInput: "password",
      confirmPasswordInput: "confirmPassword",
    }
    const fieldName = nameMap[name] || name
    if (fieldName === "password") setPassword(value)
    else setConfirmPassword(value)

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const nameMap: Record<string, string> = {
      passwordInput: "password",
      confirmPasswordInput: "confirmPassword",
    }
    const fieldName = nameMap[name] || name
    const error = validateField(fieldName, value)
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: error }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    const errors: Record<string, string> = {}
    const pwdError = validateField("password", password)
    const confirmError = validateField("confirmPassword", confirmPassword)
    if (pwdError) errors.password = pwdError
    if (confirmError) errors.confirmPassword = confirmError

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || "Đã xảy ra lỗi. Vui lòng thử lại.")
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
    } catch {
      setErrorMessage("Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (tokenError) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <Image src="/logo.png" alt="HNT" width={96} height={96} className="mx-auto mb-4 h-24 w-auto" priority />
          <CardTitle className="text-2xl font-bold">Liên kết không hợp lệ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-muted-foreground">{tokenError}</p>
          <p className="text-sm text-muted-foreground">
            Liên kết có thể đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu đặt lại mật khẩu mới.
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.push("/auth/forgot-password")}>
            Yêu cầu đặt lại mật khẩu mới
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push("/auth/login")}>
            Quay lại đăng nhập
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <Image src="/logo.png" alt="HNT" width={96} height={96} className="mx-auto mb-4 h-24 w-auto" priority />
          <CardTitle className="text-2xl font-bold">Đặt lại mật khẩu thành công!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-muted-foreground">
            Mật khẩu của bạn đã được đặt lại thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
          </p>
          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            Đăng nhập ngay
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <Image src="/logo.png" alt="HNT" width={96} height={96} className="mx-auto mb-4 h-24 w-auto" priority />
        <CardTitle className="text-2xl font-bold">Đặt lại mật khẩu</CardTitle>
        <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passwordInput" required>
              Mật khẩu mới
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="passwordInput"
                name="passwordInput"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu mới"
                value={password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`pl-10 pr-10 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPasswordInput" required>
              Xác nhận mật khẩu mới
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPasswordInput"
                name="confirmPasswordInput"
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Đặt lại mật khẩu"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        <p>
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Quay lại đăng nhập
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage({ params }: PageProps) {
  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {token !== null ? (
        <ResetPasswordContent token={token} />
      ) : (
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
