"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MapPin, Camera, Shield, Star, Clock, Check, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Breadcrumb } from "@/components/shared/breadcrumb"

interface SellerInfo {
  role: string
  sellerStatus: string
  sellerRank: string
  sellerRequestAt: string | null
  sellerApprovedAt: string | null
  isLocked: boolean
  lockedReason: string | null
  lockedAt: string | null
  sellerStats: {
    avgRating: number
    totalTransactions: number
    successRate: number
    isIdentityVerified: boolean
  } | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()

  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [avatar, setAvatar] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [avatarUploading, setAvatarUploading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [sellerInfo, setSellerInfo] = React.useState<SellerInfo | null>(null)
  const [phoneError, setPhoneError] = React.useState("")

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const validatePhone = (value: string): boolean => {
    if (!value) return true
    const phoneRegex = /^0[0-9]{9}$/
    return phoneRegex.test(value)
  }

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/profile")
      return
    }

    if (status === "authenticated") {
      fetchUserData()
    }
  }, [status, session, router])

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/profile")
      if (res.ok) {
        const data = await res.json()
        const user = data.user
        setName(user.name || "")
        setPhone(user.phone || "")
        setAvatar(user.avatar || "")
        setSellerInfo({
          role: user.role,
          sellerStatus: user.sellerStatus,
          sellerRank: user.sellerRank,
          sellerRequestAt: user.sellerRequestAt,
          sellerApprovedAt: user.sellerApprovedAt,
          isLocked: user.isLocked,
          lockedReason: user.lockedReason,
          lockedAt: user.lockedAt,
          sellerStats: user.sellerStats,
        })
      } else if (res.status === 401) {
        router.replace("/auth/login?callbackUrl=/profile")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Kích thước ảnh không được vượt quá 2MB" })
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAvatar(data.url)
        setMessage({ type: "success", text: "Tải ảnh lên thành công!" })
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Lỗi khi tải ảnh" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi khi tải ảnh, vui lòng thử lại" })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!validatePhone(phone)) {
      setPhoneError("Số điện thoại phải là 10 số và bắt đầu bằng số 0")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, avatar }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Cập nhật thành công!" })
        await update({ name, avatar })
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Có lỗi xảy ra" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại" })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  const getSellerRankLabel = (rank: string) => {
    switch (rank) {
      case "TOP_SELLER":
        return "Top Seller"
      case "TRUSTED":
        return "Đáng tin cậy"
      default:
        return "Mới"
    }
  }

  const getSellerStatusLabel = (s: string) => {
    switch (s) {
      case "APPROVED":
        return "Đã duyệt"
      case "PENDING":
        return "Đang chờ duyệt"
      case "REJECTED":
        return "Bị từ chối"
      default:
        return "Chưa đăng ký"
    }
  }

  const getSellerStatusColor = (s: string) => {
    switch (s) {
      case "APPROVED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Hồ sơ cá nhân" }]} />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ cá nhân</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-primary">
                          {session?.user?.name?.charAt(0) || "?"}
                        </span>
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAvatarClick}
                        disabled={avatarUploading}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {avatarUploading ? "Đang tải..." : "Đổi ảnh đại diện"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG. Kích thước tối đa 2MB
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={session?.user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email không thể thay đổi
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Họ tên</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="0912345678"
                        maxLength={10}
                      />
                      {phoneError && (
                        <p className="text-xs text-red-500">{phoneError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Vai trò</Label>
                      <Input
                        id="role"
                        value={
                          session?.user?.role === "ADMIN"
                            ? "Quản trị viên"
                            : session?.user?.role === "SELLER"
                            ? "Người bán"
                            : "Người mua"
                        }
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Info */}
            {sellerInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className={`h-5 w-5 ${getRankColor(sellerInfo.sellerRank)}`} />
                    Thông tin người bán
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Xếp hạng</span>
                    <span className={`font-medium flex items-center gap-1 ${getRankColor(sellerInfo.sellerRank)}`}>
                      <Star className="h-4 w-4" />
                      {getSellerRankLabel(sellerInfo.sellerRank)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trạng thái</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getSellerStatusColor(sellerInfo.sellerStatus)}`}>
                      {getSellerStatusLabel(sellerInfo.sellerStatus)}
                    </span>
                  </div>

                  {/* seller Stats */}
                  {sellerInfo.sellerStatus === "APPROVED" && sellerInfo.sellerStats && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Đánh giá TB</span>
                        <span className="font-medium flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {Number(sellerInfo.sellerStats.avgRating).toFixed(1)}/5
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Giao dịch</span>
                        <span className="font-medium">{sellerInfo.sellerStats.totalTransactions}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tỷ lệ thành công</span>
                        <span className="font-medium">
                          {Number(sellerInfo.sellerStats.successRate).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Xác minh CCCD</span>
                        <span className="font-medium">
                          {sellerInfo.sellerStats.isIdentityVerified ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Đã xác minh
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Chưa xác minh</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pending Status */}
                  {sellerInfo.sellerStatus === "PENDING" && (
                    <div className="border-t pt-4">
                      <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <Clock className="h-4 w-4" />
                          <span>Yêu cầu đang chờ duyệt</span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Thời gian xử lý: 24-48 giờ
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Tài khoản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => router.push("/profile/password")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Đổi mật khẩu
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => router.push("/addresses")}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Địa chỉ giao hàng
                </Button>
                {(sellerInfo?.role === "BUYER" || !sellerInfo?.role) && sellerInfo?.sellerStatus !== "PENDING" && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-primary"
                    onClick={() => router.push("/seller/register")}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Đăng ký bán hàng
                  </Button>
                )}
                {sellerInfo?.role === "SELLER" && sellerInfo?.sellerStatus === "APPROVED" && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-green-600"
                    onClick={() => router.push("/seller/dashboard")}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Dashboard Shop
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
