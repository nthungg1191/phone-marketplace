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
  Plus,
  MapPin,
  X as XIcon,
  Loader2,
  CreditCard,
  Image as ImageIcon,
  Scan,
  Check,
  AlertCircle,
  Info,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { cn } from "@/lib/utils"

interface SellerInfo {
  role: string
  sellerStatus: string
  sellerRank: string
  sellerRequestAt: string | null
  sellerApprovedAt: string | null
  sellerRejectedReason: string | null
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

interface Address {
  id: string
  fullName: string
  phone: string
  street: string
  provinceCode: string
  provinceName: string
  wardCode: string
  wardName: string
  district: string
  city: string
  isDefault: boolean
}

type OcrPhase = "idle" | "uploading_front" | "uploading_back" | "analyzing" | "done" | "error"

interface OcrResult {
  front: {
    idCardNumber: string | null
    idCardName: string | null
    dateOfBirth: string | null
    gender: string | null
    nationality: string | null
    expiryDate: string | null
    placeOfOrigin: string | null
  }
  back: {
    issueDate: string | null
    issuePlace: string | null
    mrzCode: string | null
  }
  confidence: {
    overall: number
    idCardNumber: number
    idCardName: number
    dateOfBirth: number
    gender: number
    nationality: number
    expiryDate: number
    issueDate: number
    issuePlace: number
  }
  warnings: string[]
}

const OCR_PHASE_LABELS: Record<OcrPhase, string> = {
  idle: "",
  uploading_front: "Đang tải ảnh mặt trước...",
  uploading_back: "Đang tải ảnh mặt sau...",
  analyzing: "AI đang đọc thông tin từ CCCD...",
  done: "Hoàn tất phân tích!",
  error: "Có lỗi xảy ra",
}

const OCR_PHASE_ORDER: OcrPhase[] = ["uploading_front", "uploading_back", "analyzing"]

function getPhaseProgress(phase: OcrPhase): number {
  switch (phase) {
    case "idle": return 0
    case "uploading_front": return 1
    case "uploading_back": return 2
    case "analyzing": return 3
    case "done": return 4
    case "error": return 0
  }
}

export default function SellerRegisterPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()

  const [sellerInfo, setSellerInfo] = React.useState<SellerInfo | null>(null)
  const [addresses, setAddresses] = React.useState<Address[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const [selectedAddressId, setSelectedAddressId] = React.useState<string>("")
  const [agreeTerms, setAgreeTerms] = React.useState(false)

  // CCCD state
  const [idCardFrontUrl, setIdCardFrontUrl] = React.useState("")
  const [idCardBackUrl, setIdCardBackUrl] = React.useState("")
  const [frontFileRef, setFrontFileRef] = React.useState<File | null>(null)
  const [backFileRef, setBackFileRef] = React.useState<File | null>(null)
  const [uploadingFront, setUploadingFront] = React.useState(false)
  const [uploadingBack, setUploadingBack] = React.useState(false)

  // OCR state
  const [ocrPhase, setOcrPhase] = React.useState<OcrPhase>("idle")
  const [ocrResult, setOcrResult] = React.useState<OcrResult | null>(null)
  const [ocrError, setOcrError] = React.useState<string | null>(null)
  const [ocrRunId, setOcrRunId] = React.useState(0)
  // Refs để chống race condition và stale closure
  const ocrRunIdRef = React.useRef(0)
  const ocrAbortRef = React.useRef<AbortController | null>(null)

  // User-editable form fields
  const [formIdCardNumber, setFormIdCardNumber] = React.useState("")
  const [formIdCardName, setFormIdCardName] = React.useState("")

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/register")
      return
    }
    if (status === "authenticated") {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      const [sellerRes, addrRes] = await Promise.all([
        fetch("/api/seller/request"),
        fetch("/api/addresses"),
      ])

      if (sellerRes.ok) {
        const data = await sellerRes.json()
        const user = data.user
        setSellerInfo({
          role: user.role,
          sellerStatus: user.sellerStatus,
          sellerRank: user.sellerRank,
          sellerRequestAt: user.sellerRequestAt,
          sellerApprovedAt: user.sellerApprovedAt,
          sellerRejectedReason: user.sellerRejectedReason,
          isLocked: user.isLocked || false,
          lockedReason: user.lockedReason || null,
          lockedAt: user.lockedAt || null,
          sellerStats: user.sellerStats,
        })
      }

      if (addrRes.ok) {
        const data = await addrRes.json()
        setAddresses(data.addresses || [])
        const defaultAddr = data.addresses?.find((a: Address) => a.isDefault)
        if (defaultAddr) setSelectedAddressId(defaultAddr.id)
        else if (data.addresses?.length > 0) setSelectedAddressId(data.addresses[0].id)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (file: File, side: "front" | "back"): Promise<string | null> => {
    const setLoading = side === "front" ? setUploadingFront : setUploadingBack
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "id-cards")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: "error", text: err.error || "Upload thất bại" })
        return null
      }
      const data = await res.json()
      return data.url as string
    } catch (err) {
      console.error("Upload error:", err)
      setMessage({ type: "error", text: "Lỗi khi upload ảnh" })
      return null
    } finally {
      setLoading(false)
    }
  }

  const runOcr = React.useCallback(async (frontFile: File | null, backFile: File | null, runId: number) => {
    if (runId !== ocrRunIdRef.current) return

    setOcrPhase("analyzing")
    setOcrError(null)

    const controller = new AbortController()
    ocrAbortRef.current = controller

    try {
      const fd = new FormData()
      if (frontFile) fd.append("front", frontFile)
      if (backFile) fd.append("back", backFile)

      const res = await fetch("/api/ocr/analyze-id-card", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      })

      if (runId !== ocrRunIdRef.current) return

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "OCR thất bại")
      }

      const result = await res.json()

      if (runId !== ocrRunIdRef.current) return

      setOcrResult(result.data)
      setOcrPhase("done")

      if (result.data?.front) {
        if (result.data.front.idCardNumber) setFormIdCardNumber(result.data.front.idCardNumber)
        if (result.data.front.idCardName) setFormIdCardName(result.data.front.idCardName)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      if (runId !== ocrRunIdRef.current) return

      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra"
      setOcrError(msg)
      setOcrPhase("error")
    } finally {
      if (ocrAbortRef.current === controller) {
        ocrAbortRef.current = null
      }
    }
  }, [])

  // Auto-trigger OCR khi cả 2 file đều có
  React.useEffect(() => {
    if (!frontFileRef || !backFileRef) return
    if (!idCardFrontUrl || !idCardBackUrl) return
    // Tránh gọi lại khi đang analyzing
    if (ocrPhase === "analyzing") return

    const newRunId = ocrRunId + 1
    setOcrRunId(newRunId)
    ocrRunIdRef.current = newRunId
    runOcr(frontFileRef, backFileRef, newRunId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontFileRef, backFileRef, idCardFrontUrl, idCardBackUrl])

  const handleFrontUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort()
      ocrAbortRef.current = null
    }

    setOcrPhase("uploading_front")
    setOcrError(null)
    const url = await uploadFile(file, "front")
    if (!url) { setOcrPhase("idle"); e.target.value = ""; return }
    setIdCardFrontUrl(url)
    setFrontFileRef(file)
    // Reset về idle để effect trigger OCR khi cả 2 file đều sẵn sàng
    setOcrPhase("idle")
    e.target.value = ""
  }

  const handleBackUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort()
      ocrAbortRef.current = null
    }

    setOcrPhase("uploading_back")
    setOcrError(null)
    const url = await uploadFile(file, "back")
    if (!url) { setOcrPhase("idle"); e.target.value = ""; return }
    setIdCardBackUrl(url)
    setBackFileRef(file)
    // Reset về idle để effect trigger OCR khi cả 2 file đều sẵn sàng
    setOcrPhase("idle")
    e.target.value = ""
  }

  const handleRemoveFront = () => {
    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort()
      ocrAbortRef.current = null
    }
    setIdCardFrontUrl("")
    setFrontFileRef(null)
    setOcrPhase("idle")
    setOcrResult(null)
    setOcrError(null)
    setOcrRunId((id) => id + 1)
    setFormIdCardNumber("")
    setFormIdCardName("")
  }

  const handleRemoveBack = () => {
    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort()
      ocrAbortRef.current = null
    }
    setIdCardBackUrl("")
    setBackFileRef(null)
    setOcrPhase("idle")
    setOcrResult(null)
    setOcrError(null)
    setOcrRunId((id) => id + 1)
    setFormIdCardNumber("")
    setFormIdCardName("")
  }

  const handleRetryOcr = () => {
    if (!frontFileRef || !backFileRef) return
    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort()
      ocrAbortRef.current = null
    }
    const newRunId = ocrRunId + 1
    setOcrRunId(newRunId)
    ocrRunIdRef.current = newRunId
    runOcr(frontFileRef, backFileRef, newRunId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!selectedAddressId) {
      setMessage({ type: "error", text: "Vui lòng chọn địa chỉ kinh doanh" })
      return
    }

    if (!idCardFrontUrl || !idCardBackUrl) {
      setMessage({ type: "error", text: "Vui lòng upload đầy đủ 2 mặt CCCD" })
      return
    }

    if (ocrPhase !== "done" && ocrPhase !== "idle") {
      setMessage({ type: "error", text: "Vui lòng chờ AI phân tích CCCD xong" })
      return
    }

    if (!formIdCardNumber.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập số CCCD" })
      return
    }
    if (!formIdCardName.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập họ tên trên CCCD" })
      return
    }

    if (!agreeTerms) {
      setMessage({ type: "error", text: "Vui lòng đồng ý với điều khoản" })
      return
    }

    const selectedAddr = addresses.find((a) => a.id === selectedAddressId)
    if (!selectedAddr) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/seller/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedAddr.phone,
          address: `${selectedAddr.street}, ${selectedAddr.wardName}, ${selectedAddr.provinceName}`,
          idCardNumber: formIdCardNumber.trim(),
          idCardName: formIdCardName.trim(),
          idCardFrontUrl,
          idCardBackUrl,
        }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Yêu cầu đăng ký đã được gửi! Chúng tôi sẽ xem xét trong 24-48 giờ." })
        await fetchData()
        await update()
      } else if (res.status === 401) {
        router.replace("/auth/login?callbackUrl=/seller/register")
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

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // Already a seller
  if (sellerInfo?.role === "SELLER" && sellerInfo?.sellerStatus === "APPROVED") {
    return (
      <div className="min-h-screen bg-muted/30">
        <Breadcrumb items={[{ label: "Hồ sơ cá nhân", href: "/profile" }, { label: "Đăng ký người bán" }]} />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Bạn đã là Người bán!</h2>
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
                          <p className="font-semibold">⭐ {Number(sellerInfo.sellerStats.avgRating).toFixed(1)}/5</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Giao dịch</p>
                          <p className="font-semibold">{sellerInfo.sellerStats.totalTransactions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tỷ lệ thành công</p>
                          <p className="font-semibold">{Number(sellerInfo.sellerStats.successRate).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Xác minh CCCD</p>
                          <p className="font-semibold">{sellerInfo.sellerStats.isIdentityVerified ? "Đã xác minh" : "Chưa xác minh"}</p>
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
      </div>
    )
  }

  // Pending approval
  if (sellerInfo?.sellerStatus === "PENDING") {
    return (
      <div className="min-h-screen bg-muted/30">
        <Breadcrumb items={[{ label: "Hồ sơ cá nhân", href: "/profile" }, { label: "Đăng ký người bán" }]} />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-yellow-700 mb-2">Yêu cầu đang được xem xét</h2>
                  <p className="text-muted-foreground mb-4">
                    Yêu cầu đăng ký của bạn đang được đội ngũ HNT xem xét.
                  </p>
                  <p className="text-sm text-yellow-600">Thời gian xử lý: 24-48 giờ làm việc</p>
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
      </div>
    )
  }

  // Rejected
  if (sellerInfo?.sellerStatus === "REJECTED") {
    return (
      <div className="min-h-screen bg-muted/30">
        <Breadcrumb items={[{ label: "Hồ sơ cá nhân", href: "/profile" }, { label: "Đăng ký người bán" }]} />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200 bg-red-50/50 mb-6">
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-700 mb-2">Yêu cầu bị từ chối</h2>
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

            {/* Re-apply */}
            <Card>
              <CardHeader>
                <CardTitle>Đăng ký lại</CardTitle>
                <CardDescription>Chọn địa chỉ kinh doanh từ sổ địa chỉ của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                {message && (
                  <div className={`p-3 rounded-lg mb-4 ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {message.text}
                  </div>
                )}

                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">Bạn chưa có địa chỉ nào trong sổ địa chỉ.</p>
                    <Button asChild>
                      <a href="/addresses" target="_blank">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm địa chỉ ngay
                      </a>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AddressSelector
                      addresses={addresses}
                      selectedId={selectedAddressId}
                      onSelect={setSelectedAddressId}
                    />
                    <IdCardSection
                      ocrPhase={ocrPhase}
                      ocrResult={ocrResult}
                      ocrError={ocrError}
                      frontUrl={idCardFrontUrl}
                      backUrl={idCardBackUrl}
                      uploadingFront={uploadingFront}
                      uploadingBack={uploadingBack}
                      formIdCardNumber={formIdCardNumber}
                      formIdCardName={formIdCardName}
                      onFrontUpload={handleFrontUploaded}
                      onBackUpload={handleBackUploaded}
                      onRemoveFront={handleRemoveFront}
                      onRemoveBack={handleRemoveBack}
                      onIdCardNumberChange={setFormIdCardNumber}
                      onIdCardNameChange={setFormIdCardName}
                      onRetryOcr={handleRetryOcr}
                    />
                    <div className="flex items-start space-x-2">
                      <Checkbox id="terms-reapply" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(!!c)} />
                      <label htmlFor="terms-reapply" className="text-sm font-normal cursor-pointer">
                        Tôi đồng ý với{" "}
                        <a href="/terms" className="text-primary hover:underline" target="_blank">Điều khoản dịch vụ</a>{" "}
                        và{" "}
                        <a href="/policy" className="text-primary hover:underline" target="_blank">Chính sách người bán</a>{" "}
                        của HNT
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1" disabled={submitting}>
                        {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <a href="/addresses" target="_blank">
                          <Plus className="h-4 w-4 mr-2" />
                          Thêm địa chỉ
                        </a>
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Registration form
  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Hồ sơ cá nhân", href: "/profile" }, { label: "Đăng ký người bán" }]} />
      <div className="container mx-auto px-4 py-6">
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
                {[
                  { icon: Shield, title: "Xác minh uy tín", desc: "Được đánh dấu là người bán đáng tin cậy" },
                  { icon: Star, title: "Trust Score", desc: "Tích lũy điểm uy tín dựa trên giao dịch" },
                  { icon: FileCheck, title: "Quản lý dễ dàng", desc: "Dashboard để quản lý sản phẩm và đơn hàng" },
                  { icon: AlertTriangle, title: "Hỗ trợ 24/7", desc: "Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Đăng ký ngay</CardTitle>
              <CardDescription>Chọn địa chỉ kinh doanh và xác minh danh tính</CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <div className={`p-3 rounded-lg mb-4 ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {message.text}
                </div>
              )}

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Chưa có địa chỉ nào</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Vui lòng thêm địa chỉ vào sổ địa chỉ trước khi đăng ký bán hàng.
                  </p>
                  <Button asChild>
                    <a href="/addresses" target="_blank">
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm địa chỉ ngay
                    </a>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AddressSelector
                    addresses={addresses}
                    selectedId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                  />
                  <IdCardSection
                    ocrPhase={ocrPhase}
                    ocrResult={ocrResult}
                    ocrError={ocrError}
                    frontUrl={idCardFrontUrl}
                    backUrl={idCardBackUrl}
                    uploadingFront={uploadingFront}
                    uploadingBack={uploadingBack}
                    formIdCardNumber={formIdCardNumber}
                    formIdCardName={formIdCardName}
                    onFrontUpload={handleFrontUploaded}
                    onBackUpload={handleBackUploaded}
                    onRemoveFront={handleRemoveFront}
                    onRemoveBack={handleRemoveBack}
                    onIdCardNumberChange={setFormIdCardNumber}
                    onIdCardNameChange={setFormIdCardName}
                    onRetryOcr={handleRetryOcr}
                  />
                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(!!c)} />
                    <label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                      Tôi đồng ý với{" "}
                      <a href="/terms" className="text-primary hover:underline" target="_blank">Điều khoản dịch vụ</a>{" "}
                      và{" "}
                      <a href="/policy" className="text-primary hover:underline" target="_blank">Chính sách người bán</a>{" "}
                      của HNT
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting ? (
                        "Đang gửi yêu cầu..."
                      ) : (
                        <>
                          <Store className="h-4 w-4 mr-2" />
                          Đăng ký ngay
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href="/addresses" target="_blank">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm địa chỉ
                      </a>
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Yêu cầu của bạn sẽ được xem xét trong vòng 24-48 giờ làm việc
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// --- Address Selector Component ---
function AddressSelector({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: Address[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Địa chỉ kinh doanh *</label>
      <div className="space-y-2">
        {addresses.map((addr) => (
          <button
            key={addr.id}
            type="button"
            onClick={() => onSelect(addr.id)}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-colors",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              selectedId === addr.id
                ? "border-primary bg-primary/5"
                : "border-muted bg-background"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                selectedId === addr.id ? "border-primary bg-primary" : "border-muted-foreground"
              )}>
                {selectedId === addr.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{addr.fullName}</span>
                  <span className="text-muted-foreground text-sm">{addr.phone}</span>
                  {addr.isDefault && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Mặc định</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {[addr.street, addr.wardName, addr.provinceName].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Địa chỉ và số điện thoại sẽ được sử dụng làm thông tin kinh doanh
      </p>
    </div>
  )
}

// --- CCCD Upload + OCR Section ---
function IdCardSection({
  ocrPhase,
  ocrResult,
  ocrError,
  frontUrl,
  backUrl,
  uploadingFront,
  uploadingBack,
  formIdCardNumber,
  formIdCardName,
  onFrontUpload,
  onBackUpload,
  onRemoveFront,
  onRemoveBack,
  onIdCardNumberChange,
  onIdCardNameChange,
  onRetryOcr,
}: {
  ocrPhase: OcrPhase
  ocrResult: OcrResult | null
  ocrError: string | null
  frontUrl: string
  backUrl: string
  uploadingFront: boolean
  uploadingBack: boolean
  formIdCardNumber: string
  formIdCardName: string
  onFrontUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBackUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFront: () => void
  onRemoveBack: () => void
  onIdCardNumberChange: (v: string) => void
  onIdCardNameChange: (v: string) => void
  onRetryOcr: () => void
}) {
  const phaseOrder: OcrPhase[] = ["uploading_front", "uploading_back", "analyzing"]
  const currentPhaseIdx = phaseOrder.indexOf(ocrPhase)
  const showProgress = ocrPhase !== "idle" && ocrPhase !== "done" && ocrPhase !== "error"
  const showReviewForm = ocrPhase === "done" || ocrPhase === "error"

  const frontConfidence = ocrResult?.confidence?.idCardNumber ?? null
  const nameConfidence = ocrResult?.confidence?.idCardName ?? null

  return (
    <div className="space-y-4 pt-2 border-t">
      <div className="flex items-center gap-2 pt-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Xác minh danh tính (CCCD/CMND) *</h4>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Upload 2 mặt CCCD — AI sẽ tự động đọc thông tin. Vui lòng kiểm tra lại trước khi gửi.
      </p>

      {/* Progress bar */}
      {showProgress && (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-5">
          {/* Animated scan line */}
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div
              className="h-full w-full animate-[scanLine_2s_ease-in-out_infinite]"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.12) 50%, transparent 100%)",
              }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-4 relative">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scan className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{OCR_PHASE_LABELS[ocrPhase]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI đang phân tích CCCD của bạn
                </p>
              </div>
            </div>
            {/* Percentage */}
            <div className="text-right">
              <span className="text-2xl font-bold text-primary tabular-nums">
                {ocrPhase === "analyzing" ? (
                  <span className="inline-flex items-center gap-0.5">
                    AI
                    <span className="inline-flex gap-0.5 ml-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                    </span>
                  </span>
                ) : (
                  `${Math.round(((currentPhaseIdx + 1) / 3) * 100)}%`
                )}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2.5 bg-muted rounded-full overflow-hidden mb-4">
            {ocrPhase === "analyzing" ? (
              <>
                <div
                  className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-primary via-blue-500 to-primary rounded-full shadow-lg shadow-primary/40"
                  style={{
                    animation: "progressIndeterminate 1.5s ease-in-out infinite",
                  }}
                />
                <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                  <div
                    className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-blue-500 rounded-full shadow-lg shadow-primary/30 transition-all duration-700 ease-out"
                  style={{
                    width: `${((currentPhaseIdx + 1) / 3) * 100}%`,
                  }}
                />
                <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                  <div
                    className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Steps */}
          <div className="grid grid-cols-3 gap-2 relative">
            {([
              { key: "uploading_front", label: "Tải ảnh trước", icon: CreditCard },
              { key: "uploading_back", label: "Tải ảnh sau", icon: ImageIcon },
              { key: "analyzing", label: "AI đọc CCCD", icon: Scan },
            ] as const).map(({ key, label, icon: Icon }, idx) => {
              const isDone = idx < currentPhaseIdx
              const isActive = idx === currentPhaseIdx
              const isPending = idx > currentPhaseIdx

              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all duration-300",
                    isDone && "bg-green-50 border border-green-200",
                    isActive && "bg-primary/5 border border-primary/30",
                    isPending && "bg-muted/50 border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                      isDone && "bg-green-500 text-white scale-100",
                      isActive && "bg-primary text-white scale-105 shadow-lg shadow-primary/30 animate-pulse",
                      isPending && "bg-muted text-muted-foreground scale-95"
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isActive ? (
                      <Icon className="h-3.5 w-3.5 animate-pulse" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium text-center leading-tight",
                      isDone && "text-green-700",
                      isActive && "text-primary",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error state */}
      {ocrPhase === "error" && ocrError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">{ocrError}</p>
            <p className="text-xs text-red-600 mt-1">Vui lòng upload lại ảnh rõ hơn và thử lại.</p>
          </div>
          <Button size="sm" variant="outline" onClick={onRetryOcr} className="shrink-0 text-red-700 border-red-200 hover:bg-red-50">
            Thử lại
          </Button>
        </div>
      )}

      {/* AI warnings */}
      {ocrPhase === "done" && ocrResult?.warnings && ocrResult.warnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            {ocrResult.warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-700">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <IdCardUploader
          side="front"
          label="Mặt trước CCCD"
          url={frontUrl}
          uploading={uploadingFront}
          analyzing={ocrPhase === "analyzing" || ocrPhase === "uploading_front"}
          onUpload={onFrontUpload}
          onRemove={onRemoveFront}
        />
        <IdCardUploader
          side="back"
          label="Mặt sau CCCD"
          url={backUrl}
          uploading={uploadingBack}
          analyzing={ocrPhase === "analyzing" || ocrPhase === "uploading_back"}
          onUpload={onBackUpload}
          onRemove={onRemoveBack}
        />
      </div>

      {/* Review form — chỉ hiện khi AI xong */}
      {showReviewForm && (
        <div className="space-y-3 p-4 bg-green-50/50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">AI đã đọc xong — vui lòng kiểm tra</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="idCardNumber" className="text-xs">Số CCCD *</Label>
                {frontConfidence !== null && (
                  <ConfidenceBadge confidence={frontConfidence} />
                )}
              </div>
              <Input
                id="idCardNumber"
                value={formIdCardNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 12)
                  onIdCardNumberChange(v)
                }}
                placeholder="AI điền hoặc nhập tay..."
                maxLength={12}
                inputMode="numeric"
              />
              {frontConfidence !== null && frontConfidence < 0.7 && (
                <p className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Ảnh mờ — vui lòng kiểm tra kỹ số CCCD
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="idCardName" className="text-xs">Họ tên trên CCCD *</Label>
                {nameConfidence !== null && (
                  <ConfidenceBadge confidence={nameConfidence} />
                )}
              </div>
              <Input
                id="idCardName"
                value={formIdCardName}
                onChange={(e) => onIdCardNameChange(e.target.value.toUpperCase())}
                placeholder="AI điền hoặc nhập tay..."
                maxLength={100}
                className="uppercase"
              />
            </div>
          </div>

          {ocrResult && (
            <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Thông tin bổ sung:</p>
                {ocrResult.front.dateOfBirth && <p>Ngày sinh: {ocrResult.front.dateOfBirth}</p>}
                {ocrResult.front.gender && <p>Giới tính: {ocrResult.front.gender}</p>}
                
                {ocrResult.front.placeOfOrigin && <p>Quê quán: {ocrResult.front.placeOfOrigin}</p>}
                {ocrResult.back.issueDate && <p>Ngày cấp: {ocrResult.back.issueDate}</p>}
                {ocrResult.back.issuePlace && <p>Nơi cấp: {ocrResult.back.issuePlace}</p>}
                {ocrResult.front.expiryDate && <p>Ngày hết hạn: {ocrResult.front.expiryDate}</p>}
                {ocrResult.confidence.overall > 0 && (
                  <p className="mt-1 font-medium">
                    Độ tin cậy tổng: {Math.round(ocrResult.confidence.overall * 100)}%
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetryOcr}
            className="text-muted-foreground"
          >
            <Scan className="h-3 w-3 mr-1.5" />
            Đọc lại CCCD
          </Button>
        </div>
      )}

      {!showReviewForm && ocrPhase === "idle" && frontUrl && backUrl && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Đang chờ AI phân tích... Vui lòng đợi.
        </p>
      )}
    </div>
  )
}

// --- Confidence Badge ---
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  let color = "text-green-600 bg-green-50 border-green-200"
  if (confidence < 0.5) color = "text-red-600 bg-red-50 border-red-200"
  else if (confidence < 0.7) color = "text-yellow-600 bg-yellow-50 border-yellow-200"

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border font-medium",
      color
    )}>
      {confidence >= 0.7 ? (
        <Check className="h-2.5 w-2.5" />
      ) : (
        <AlertCircle className="h-2.5 w-2.5" />
      )}
      {pct}%
    </span>
  )
}

// --- IdCard Uploader ---
function IdCardUploader({
  side,
  label,
  url,
  uploading,
  analyzing,
  onUpload,
  onRemove,
}: {
  side: "front" | "back"
  label: string
  url: string
  uploading: boolean
  analyzing: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  const inputId = `idcard-${side}-input`
  const isLoading = uploading || analyzing

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} *</Label>
      {url ? (
        <div className="relative group border-2 border-primary rounded-lg overflow-hidden bg-muted aspect-[3/2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`CCCD ${label}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onRemove}
              className="h-8 px-3"
            >
              <XIcon className="h-3 w-3 mr-1" />
              Xóa
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex flex-col items-center justify-center aspect-[3/2] border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isLoading
              ? "pointer-events-none opacity-60 border-muted-foreground/30"
              : "hover:border-primary hover:bg-primary/5 border-muted-foreground/40"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">
                {uploading ? "Đang tải lên..." : "AI đang xử lý..."}
              </span>
            </>
          ) : (
            <>
              {side === "front" ? (
                <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              )}
              <span className="text-xs font-medium text-muted-foreground">Tải ảnh lên</span>
              <span className="text-xs text-muted-foreground/60 mt-1">JPG, PNG (tối đa 5MB)</span>
            </>
          )}
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            onChange={onUpload}
            className="hidden"
            disabled={isLoading}
          />
        </label>
      )}
    </div>
  )
}
