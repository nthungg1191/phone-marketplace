"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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

interface SellerRegisterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SellerRegisterModal({ open, onOpenChange }: SellerRegisterModalProps) {
  const router = useRouter()
  const [sellerInfo, setSellerInfo] = React.useState<SellerInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [agreeTerms, setAgreeTerms] = React.useState(false)
  const [phoneError, setPhoneError] = React.useState("")

  React.useEffect(() => {
    if (open) {
      fetchSellerInfo()
    }
  }, [open])

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
      case "TOP_SELLER": return "Top Seller"
      case "TRUSTED": return "Đáng tin cậy"
      default: return "Mới"
    }
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "TOP_SELLER": return "text-yellow-500"
      case "TRUSTED": return "text-blue-500"
      default: return "text-gray-500"
    }
  }

  const handleNavigate = (path: string) => {
    onOpenChange(false)
    router.push(path)
  }

  // Already a seller
  if (!loading && sellerInfo?.role === "SELLER" && sellerInfo?.sellerStatus === "APPROVED") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Bạn đã là Người bán!
            </DialogTitle>
            <DialogDescription className="text-sm">
              Cửa hàng của bạn đã được xác minh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Star className={`h-5 w-5 ${getRankColor(sellerInfo.sellerRank)}`} />
              <span className="font-medium">Hạng: {getRankLabel(sellerInfo.sellerRank)}</span>
            </div>
            {sellerInfo.sellerStats && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Đánh giá TB</p>
                  <p className="font-medium">⭐ {Number(sellerInfo.sellerStats.avgRating).toFixed(1)}/5</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Giao dịch</p>
                  <p className="font-medium">{sellerInfo.sellerStats.totalTransactions}</p>
                </div>
              </div>
            )}
            <Button onClick={() => handleNavigate("/seller/dashboard")} className="w-full">
              <Store className="h-4 w-4 mr-2" />
              Truy cập Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Pending
  if (!loading && sellerInfo?.sellerStatus === "PENDING") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Đang chờ duyệt
            </DialogTitle>
            <DialogDescription className="text-sm">
              Yêu cầu của bạn đang được xem xét.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-yellow-600">
              Thời gian xử lý: 24-48 giờ làm việc
            </p>
            {sellerInfo.sellerRequestAt && (
              <p className="text-sm text-muted-foreground">
                Ngày gửi: {new Date(sellerInfo.sellerRequestAt).toLocaleDateString("vi-VN")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Rejected
  if (!loading && sellerInfo?.sellerStatus === "REJECTED") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Yêu cầu bị từ chối
            </DialogTitle>
            <DialogDescription className="text-sm">
              Rất tiếc, yêu cầu đăng ký của bạn không được chấp nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sellerInfo.sellerRejectedReason && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-red-600 mb-1">Lý do:</p>
                <p>{sellerInfo.sellerRejectedReason}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {message.text}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="modal-phone" className="text-sm">Số điện thoại kinh doanh *</Label>
                <Input
                  id="modal-phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="0912345678"
                  maxLength={10}
                  className="h-9"
                />
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-address" className="text-sm">Địa chỉ kinh doanh *</Label>
                <Textarea
                  id="modal-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="modal-terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                />
                <Label htmlFor="modal-terms" className="text-sm font-normal cursor-pointer">
                  Tôi đồng ý với điều khoản của EUT
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Registration form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Trở thành Người bán
          </DialogTitle>
          <DialogDescription className="text-sm">
            Bắt đầu bán hàng và tiếp cận hàng triệu khách hàng tiềm năng
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-medium">Xác minh uy tín</p>
          </div>
          <div className="flex items-start gap-2">
            <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-medium">Trust Score</p>
          </div>
          <div className="flex items-start gap-2">
            <FileCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-medium">Quản lý dễ dàng</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-medium">Hỗ trợ 24/7</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {message.text}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reg-phone" className="text-sm">Số điện thoại kinh doanh *</Label>
            <Input
              id="reg-phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="0912345678"
              maxLength={10}
              className="h-9"
            />
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-address" className="text-sm">Địa chỉ kinh doanh *</Label>
            <Textarea
              id="reg-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố"
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="reg-terms"
              checked={agreeTerms}
              onCheckedChange={(checked) => setAgreeTerms(!!checked)}
            />
            <Label htmlFor="reg-terms" className="text-sm font-normal cursor-pointer">
              Tôi đồng ý với điều khoản của EUT
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Đang gửi..." : "Đăng ký ngay"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Yêu cầu sẽ được xem xét trong 24-48 giờ
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
