"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Shield,
  Store,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Star,
  FileCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb } from "@/components/shared/breadcrumb"

interface SellerInfo {
  role: string
  sellerStatus: string
  sellerRank: string
  sellerRequestAt: string | null
  sellerApprovedAt: string | null
  sellerRejectedReason: string | null
  sellerStats: {
    avgRating: number
    totalTransactions: number
    successRate: number
    isIdentityVerified: boolean
  } | null
}

export default function SellerRegisterPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()

  const [sellerInfo, setSellerInfo] = React.useState<SellerInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [agreeTerms, setAgreeTerms] = React.useState(false)
  const [phoneError, setPhoneError] = React.useState("")

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/register")
      return
    }

    if (status === "authenticated") {
      fetchSellerInfo()
    }
  }, [status, router])

  const fetchSellerInfo = async () => {
    try {
      const res = await fetch("/api/profile")
      if (res.ok) {
        const data = await res.json()
        const user = data.user
        setSellerInfo({
          role: user.role,
          sellerStatus: user.sellerStatus,
          sellerRank: user.sellerRank,
          sellerRequestAt: user.sellerRequestAt,
          sellerApprovedAt: user.sellerApprovedAt,
          sellerRejectedReason: user.sellerRejectedReason,
          sellerStats: user.sellerStats,
        })
      }
    } catch (error) {
      console.error("Error fetching seller info:", error)
    } finally {
      setLoading(false)
    }
  }

  const validatePhone = (value: string): boolean => {
    if (!value) return false
    const phoneRegex = /^0[0-9]{9}$/
    return phoneRegex.test(value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const filtered = value.replace(/[^0-9]/g, "").slice(0, 10)
    setPhone(filtered)
    if (filtered && !validatePhone(filtered)) {
      setPhoneError("Số điện thoại phải là 10 số và bắt đầu bằng số 0")
    } else {
      setPhoneError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validatePhone(phone)) {
      setPhoneError("Số điện thoại phải là 10 số và bắt đầu bằng số 0")
      return
    }

    if (!address.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập địa chỉ kinh doanh" })
      return
    }

    if (!agreeTerms) {
      setMessage({ type: "error", text: "Vui lòng đồng ý với điều khoản" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/seller/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Yêu cầu đăng ký đã được gửi! Chúng tôi sẽ xem xét trong 24-48 giờ." })
        await fetchSellerInfo()
        await update()
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Có lỗi xảy ra" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại" })
    } finally {
      setSubmitting(false)
    }
  }

  const getRankLabel = (rank: string) => {
    switch (rank) {
      case "TOP_SELLER":
        return "Top Seller"
      case "TRUSTED":
        return "Đáng tin cậy"
      default:
        return "Mới"
    }
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "TOP_SELLER":
        return "text-yellow-500"
      case "TRUSTED":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // Already a seller
  if (sellerInfo?.role === "SELLER" && sellerInfo?.sellerStatus === "APPROVED") {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Đăng ký người bán" }]} />

        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">
                  Bạn đã là Người bán!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Cửa hàng của bạn đã được xác minh và sẵn sàng để bán hàng.
                </p>

                <div className="bg-white rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Star className={`h-5 w-5 ${getRankColor(sellerInfo.sellerRank)}`} />
                    <span className="font-semibold">Hạng: {getRankLabel(sellerInfo.sellerRank)}</span>
                  </div>

                  {sellerInfo.sellerStats && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Đánh giá TB</p>
                        <p className="font-semibold">
                          ⭐ {Number(sellerInfo.sellerStats.avgRating).toFixed(1)}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Giao dịch</p>
                        <p className="font-semibold">{sellerInfo.sellerStats.totalTransactions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tỷ lệ thành công</p>
                        <p className="font-semibold">
                          {Number(sellerInfo.sellerStats.successRate).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Xác minh CCCD</p>
                        <p className="font-semibold">
                          {sellerInfo.sellerStats.isIdentityVerified ? "Đã xác minh" : "Chưa xác minh"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={() => router.push("/seller/dashboard")} size="lg">
                  <Store className="h-4 w-4 mr-2" />
                  Truy cập Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Pending approval
  if (sellerInfo?.sellerStatus === "PENDING") {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Đăng ký người bán" }]} />

        <div className="max-w-2xl mx-auto">
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-yellow-700 mb-2">
                  Yêu cầu đang được xem xét
                </h2>
                <p className="text-muted-foreground mb-4">
                  Yêu cầu đăng ký của bạn đang được đội ngũ HNT xem xét.
                </p>
                <p className="text-sm text-yellow-600">
                  Thời gian xử lý: 24-48 giờ làm việc
                </p>

                {sellerInfo.sellerRequestAt && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Ngày gửi: {new Date(sellerInfo.sellerRequestAt).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Rejected
  if (sellerInfo?.sellerStatus === "REJECTED") {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Đăng ký người bán" }]} />

        <div className="max-w-2xl mx-auto">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2">
                  Yêu cầu bị từ chối
                </h2>
                <p className="text-muted-foreground mb-4">
                  Rất tiếc, yêu cầu đăng ký của bạn không được chấp nhận.
                </p>

                {sellerInfo.sellerRejectedReason && (
                  <div className="bg-white rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm font-medium text-red-600 mb-1">Lý do:</p>
                    <p className="text-sm">{sellerInfo.sellerRejectedReason}</p>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mb-4">
                  Bạn có thể gửi lại yêu cầu sau khi khắc phục các vấn đề trên.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Re-apply form */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Đăng ký lại</CardTitle>
              <CardDescription>
                Vui lòng điều chỉnh thông tin và gửi lại yêu cầu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <div
                  className={`p-3 rounded-lg mb-4 ${
                    message.type === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại kinh doanh *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="0912345678"
                    maxLength={10}
                  />
                  {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ kinh doanh *</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố"
                    rows={3}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                  />
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                    Tôi đồng ý với{" "}
                    <a href="/terms" className="text-primary hover:underline" target="_blank">
                      Điều khoản dịch vụ
                    </a>{" "}
                    và{" "}
                    <a href="/policy" className="text-primary hover:underline" target="_blank">
                      Chính sách người bán
                    </a>{" "}
                    của HNT
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Registration form (NONE status or no seller info)
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Đăng ký người bán" }]} />

      <div className="max-w-2xl mx-auto">
        {/* Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Trở thành Người bán trên HNT
            </CardTitle>
            <CardDescription>
              Bắt đầu bán hàng và tiếp cận hàng triệu khách hàng tiềm năng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Xác minh uy tín</p>
                  <p className="text-sm text-muted-foreground">
                    Được đánh dấu là người bán đáng tin cậy
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Trust Score</p>
                  <p className="text-sm text-muted-foreground">
                    Tích lũy điểm uy tín dựa trên giao dịch
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <FileCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Quản lý dễ dàng</p>
                  <p className="text-sm text-muted-foreground">
                    Dashboard để quản lý sản phẩm và đơn hàng
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Hỗ trợ 24/7</p>
                  <p className="text-sm text-muted-foreground">
                    Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng ký ngay</CardTitle>
            <CardDescription>
              Điền thông tin bên dưới để bắt đầu quá trình đăng ký
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div
                className={`p-3 rounded-lg mb-4 ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại kinh doanh *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="0912345678"
                  maxLength={10}
                />
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                <p className="text-xs text-muted-foreground">
                  Số điện thoại này sẽ được hiển thị cho khách hàng
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ kinh doanh *</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Địa chỉ này sẽ được sử dụng để giao hàng và xác minh
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                  Tôi đồng ý với{" "}
                  <a href="/terms" className="text-primary hover:underline" target="_blank">
                    Điều khoản dịch vụ
                  </a>{" "}
                  và{" "}
                  <a href="/policy" className="text-primary hover:underline" target="_blank">
                    Chính sách người bán
                  </a>{" "}
                  của HNT
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  "Đang gửi yêu cầu..."
                ) : (
                  <>
                    <Store className="h-4 w-4 mr-2" />
                    Đăng ký ngay
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Yêu cầu của bạn sẽ được xem xét trong vòng 24-48 giờ làm việc
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
