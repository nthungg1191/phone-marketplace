"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldOff, XCircle, AlertTriangle } from "lucide-react"

interface LockInfo {
  isLocked: boolean
  reason: string
  lockedAt: string
}

interface LoginError {
  show: boolean
  title: string
  message: string
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [lockInfo, setLockInfo] = React.useState<LockInfo | null>(null)
  const [loginError, setLoginError] = React.useState<LoginError>({ show: false, title: "", message: "" })

  React.useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl)
    }
  }, [status, callbackUrl, router])

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      const errStr = String(result.error)

      if (errStr === "AccessDenied") {
        const lockRes = await fetch(`/api/auth/lock-info?email=${encodeURIComponent(email)}`)
        if (lockRes.ok) {
          const lockData = await lockRes.json()
          if (lockData.isLocked) {
            setLockInfo({
              isLocked: true,
              reason: lockData.lockedReason || "Tài khoản đã bị khóa",
              lockedAt: "",
            })
            setIsLoading(false)
            return
          }
        }
        setLockInfo({ isLocked: true, reason: "Tài khoản đã bị khóa", lockedAt: "" })
      } else {
        setLoginError({
          show: true,
          title: "Đăng nhập thất bại",
          message: "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin đăng nhập.",
        })
      }
      setIsLoading(false)
      return
    }

    router.push(callbackUrl)
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl })
  }

  return (
    <>
      {/* Login Error Dialog */}
      <Dialog open={loginError.show} onOpenChange={(open) => setLoginError((prev) => ({ ...prev, show: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-600">{loginError.title}</DialogTitle>
            <DialogDescription className="text-center">
              {loginError.message}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button variant="outline" onClick={() => setLoginError((prev) => ({ ...prev, show: false }))}>
              Đóng
            </Button>
            <Button variant="link" asChild onClick={() => setLoginError((prev) => ({ ...prev, show: false }))}>
              <Link href="/auth/forgot-password">Quên mật khẩu?</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Locked Account Dialog */}
      <Dialog open={!!lockInfo} onOpenChange={() => setLockInfo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldOff className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-600">Tài khoản đã bị khóa</DialogTitle>
            <DialogDescription className="text-center">
              Tài khoản của bạn đã bị tạm khóa và không thể đăng nhập.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Lock Reason */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lý do khóa</p>
                  <p className="font-medium mt-1">{lockInfo?.reason}</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Liên hệ hỗ trợ:</strong> Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ qua email <strong>hotro.hnt@gmail.com</strong> để được giải quyết.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setLockInfo(null)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <CardTitle className="text-2xl font-bold">Chào mừng trở lại</CardTitle>
            <CardDescription>
              Đăng nhập để tiếp tục mua sắm
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" required>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nguyenvana@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>Mật khẩu</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Hoặc tiếp tục với</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Đăng nhập với Google
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Chưa có tài khoản?{" "}
              <Link href="/auth/register" className="text-primary hover:underline font-medium">
                Đăng ký ngay
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

function LoginFallback() {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" />
        <div className="h-8 bg-muted rounded w-48 mx-auto animate-pulse" />
        <div className="h-4 bg-muted rounded w-64 mx-auto animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-primary rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </div>
  )
}
