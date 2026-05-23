"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import DeviceHealthUploader from "@/components/shared/device-health-uploader"
import ImageUploader from "@/components/shared/image-uploader"

interface HealthCheckData {
  modelName?: string
  serialNumber?: string
  imei?: string | null
  regionInfo?: string
  wifiMacAddress?: string
  bluetoothMacAddress?: string
  activationStatus?: string
  batteryCycleCount?: number
  batteryManufacturer?: string
  iosVersion?: string
  jailbreakStatus?: string
  batteryHealth?: number
  batteryVoltage?: string
  screen?: string
  cameraFront?: string
  cameraBack?: string
  speaker?: string
  microphone?: string
  faceId?: string
  fingerprint?: string
  buttons?: string
  wifi?: string
  bluetooth?: string
  nfc?: string
  chargingPort?: string
  proximitySensor?: string
  accelerometer?: string
  gyroscope?: string
  facetime?: string
  siri?: string
  overallStatus?: string
  notes?: string
}

interface ProductFormProps {
  product?: ProductFormData
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
}

export interface ProductFormData {
  id?: string
  brandId?: string
  modelId: string
  categoryId?: string
  title?: string
  description?: string | null
  condition: string
  warranty: string
  ramGb: number
  storageGb: number
  color: string
  imei?: string | null
  batteryHealth: number
  price?: number | string
  negotiable: boolean
  images?: string[] | { url: string; isPrimary: boolean }[]
  healthCheck: {
    modelName: string
    serialNumber: string
    imei?: string | null
    regionInfo: string
    wifiMacAddress: string
    bluetoothMacAddress: string
    activationStatus: string
    batteryCycleCount: number
    batteryManufacturer: string
    iosVersion: string
    jailbreakStatus: string
    batteryHealth: number
    batteryVoltage: string
    screen: string
    cameraFront: string
    cameraBack: string
    speaker: string
    microphone: string
    faceId: string
    fingerprint: string
    buttons: string
    wifi: string
    bluetooth: string
    nfc: string
    chargingPort: string
    proximitySensor: string
    accelerometer: string
    gyroscope: string
    facetime: string
    siri: string
    overallStatus: string
    notes: string
  }
}

interface Brand {
  id: string
  name: string
  slug: string
  logo?: string
}

interface PhoneModel {
  id: string
  name: string
  slug: string
  releaseYear?: number
  defaultRam?: number[]
  defaultStorage?: number[]
  basePrice?: number
}

// Tình trạng máy mới
const CONDITIONS = [
  { value: "LIKE_NEW", label: "Như mới (99-100%)", desc: "Máy mới chưa qua sử dụng, đẹp hoàn hảo" },
  { value: "PERFECT_99", label: "99%", desc: "Máy đã sử dụng rất ít, gần như mới" },
  { value: "EXCELLENT_98", label: "98%", desc: "Máy đẹp, có thể có vài vết xước nhỏ không nhìn thấy" },
  { value: "EXCELLENT_97", label: "97%", desc: "Máy đẹp, có vài vết xước nhẹ" },
  { value: "GOOD", label: "Dưới 97%", desc: "Máy có dấu hiệu sử dụng, xước nhẹ đến trung bình" },
]

// Bảo hành
const WARRANTIES = [
  { value: "WITH_WARRANTY", label: "Còn bảo hành", desc: "Còn thời hạn bảo hành chính hãng" },
  { value: "OUT_OF_WARRANTY", label: "Hết bảo hành", desc: "Đã hết bảo hành chính hãng" },
  { value: "SELLER_WARRANTY", label: "Bảo hành người bán", desc: "Người bán bảo hành riêng" },
]

// RAM options cho iPhone và Android
const RAM_OPTIONS = [
  { value: 1, label: "1 GB" },
  { value: 2, label: "2 GB" },
  { value: 3, label: "3 GB" },
  { value: 4, label: "4 GB" },
  { value: 6, label: "6 GB" },
  { value: 8, label: "8 GB" },
  { value: 12, label: "12 GB" },
]

const STORAGE_OPTIONS = [16,32, 64, 128, 256, 512, 1024]

const COLORS = [
  "Đen", "Trắng", "Xám", "Vàng", "Hồng", "Xanh dương", "Xanh lá", 
  "Tím", "Đỏ", "Cam", "Gold", "Silver", "Graphite", "Pacific Blue", 
  "Starlight", "Midnight", "Natural Titanium", "Blue Titanium", 
  "White Titanium", "Black Titanium"
]

export default function ProductForm({ product, onSubmit, isLoading }: ProductFormProps) {
  const router = useRouter()
  const { status } = useSession()

  // Form state
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [isIphone, setIsIphone] = React.useState(false)
  const [models, setModels] = React.useState<PhoneModel[]>([])

  const [formData, setFormData] = React.useState<ProductFormData>({
    brandId: product?.brandId || "",
    modelId: product?.modelId || "",
    categoryId: product?.categoryId || "",
    title: product?.title || "",
    description: product?.description || "",
    condition: product?.condition || "",
    warranty: product?.warranty || "OUT_OF_WARRANTY",
    ramGb: product?.ramGb || 0,
    storageGb: product?.storageGb || 0,
    color: product?.color || "",
    imei: product?.imei || "",
    batteryHealth: product?.batteryHealth || 100,
    price: product?.price || 0,
    negotiable: product?.negotiable ?? true,
    images: product?.images || [],
    healthCheck: product?.healthCheck || {
      modelName: "",
      serialNumber: "",
      imei: "",
      regionInfo: "",
      wifiMacAddress: "",
      bluetoothMacAddress: "",
      activationStatus: "",
      batteryCycleCount: 0,
      batteryManufacturer: "",
      iosVersion: "",
      jailbreakStatus: "",
      batteryHealth: 100,
      batteryVoltage: "",
      screen: "NOT_TESTED",
      cameraFront: "NOT_TESTED",
      cameraBack: "NOT_TESTED",
      speaker: "NOT_TESTED",
      microphone: "NOT_TESTED",
      faceId: "NOT_TESTED",
      fingerprint: "NOT_TESTED",
      buttons: "NOT_TESTED",
      wifi: "NOT_TESTED",
      bluetooth: "NOT_TESTED",
      nfc: "NOT_TESTED",
      chargingPort: "NOT_TESTED",
      proximitySensor: "NOT_TESTED",
      accelerometer: "NOT_TESTED",
      gyroscope: "NOT_TESTED",
      facetime: "NOT_TESTED",
      siri: "NOT_TESTED",
      overallStatus: "",
      notes: "",
    },
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [loadingBrands, setLoadingBrands] = React.useState(false)
  const [showHealthUploader, setShowHealthUploader] = React.useState(false)
  const [showCustomModel, setShowCustomModel] = React.useState(false)
  const [customModelName, setCustomModelName] = React.useState("")
  const [customRam, setCustomRam] = React.useState(8)
  const [customStorage, setCustomStorage] = React.useState(256)
  const [creatingModel, setCreatingModel] = React.useState(false)

  // Fetch brands when authenticated
  React.useEffect(() => {
    if (status === "authenticated") {
      fetchBrands()
    }
  }, [status])

  // Check if brand is iPhone
  React.useEffect(() => {
    const brand = brands.find(b => b.id === formData.brandId)
    if (brand) {
      setIsIphone(brand.name.toLowerCase().includes("iphone") || brand.slug.includes("apple"))
    } else {
      setIsIphone(false)
    }
  }, [formData.brandId, brands])

  // Fetch models when brand changes
  React.useEffect(() => {
    if (formData.brandId) {
      fetchModels(formData.brandId)
    } else {
      setModels([])
      setFormData((prev) => ({ ...prev, modelId: "" }))
    }
  }, [formData.brandId])

  // Auto-fill info when model changes
  React.useEffect(() => {
    if (formData.modelId && models.length > 0) {
      const model = models.find((m) => m.id === formData.modelId)
      const brand = brands.find((b) => b.id === formData.brandId)
      
      if (model && brand) {
        // Auto-fill title if empty
        if (!formData.title) {
          setFormData((prev) => ({
            ...prev,
            title: `${brand.name} ${model.name}`,
          }))
        }
        
        // Auto-fill default RAM (first option)
        if (!formData.ramGb && model.defaultRam && model.defaultRam.length > 0) {
          setFormData((prev) => ({
            ...prev,
            ramGb: model.defaultRam![0],
          }))
        }
        
        // Auto-fill default storage (first option)
        if (!formData.storageGb && model.defaultStorage && model.defaultStorage.length > 0) {
          setFormData((prev) => ({
            ...prev,
            storageGb: model.defaultStorage![0],
          }))
        }
        
        // Auto-fill base price if empty
        if (!formData.price && model.basePrice) {
          setFormData((prev) => ({
            ...prev,
            price: model.basePrice! * 0.8, // 80% của giá mới
          }))
        }
      }
    }
  }, [formData.modelId, models, brands])

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true)
      const res = await fetch("/api/brands")
      if (res.ok) {
        const data = await res.json()
        setBrands(data.brands || [])
      }
    } catch (error) {
      console.error("Error fetching brands:", error)
    } finally {
      setLoadingBrands(false)
    }
  }

  const fetchModels = async (brandId: string) => {
    try {
      const res = await fetch(`/api/phone-models?brandId=${brandId}`)
      if (res.ok) {
        const data = await res.json()
        setModels(data.phoneModels || [])
      }
    } catch (error) {
      console.error("Error fetching models:", error)
    }
  }

  // Create custom model
  const handleCreateCustomModel = async () => {
    if (!customModelName.trim() || !formData.brandId) return

    try {
      setCreatingModel(true)
      const res = await fetch("/api/phone-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: formData.brandId,
          name: customModelName.trim(),
          defaultRam: [customRam],
          defaultStorage: [customStorage],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newModel = data.phoneModel
        
        // Add to models list
        setModels((prev) => [...prev, newModel])
        
        // Select the new model
        setFormData((prev) => ({
          ...prev,
          modelId: newModel.id,
          ramGb: customRam,
          storageGb: customStorage,
          title: `${brands.find(b => b.id === formData.brandId)?.name} ${newModel.name}`,
        }))
        
        // Reset custom model state
        setShowCustomModel(false)
        setCustomModelName("")
        setCustomRam(8)
        setCustomStorage(256)
      } else {
        const error = await res.json()
        console.error("Error creating model:", error)
      }
    } catch (error) {
      console.error("Error creating model:", error)
    } finally {
      setCreatingModel(false)
    }
  }

  const handleHealthCheckChange = (key: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      healthCheck: {
        ...prev.healthCheck,
        [key]: value,
      },
    }))
  }

  // Handle health data from AI OCR
  const handleHealthDataExtracted = (data: HealthCheckData) => {
    setFormData((prev) => ({
      ...prev,
      imei: data.imei || prev.imei,
      batteryHealth: data.batteryHealth || prev.batteryHealth,
      healthCheck: {
        modelName: data.modelName || "",
        serialNumber: data.serialNumber || "",
        imei: data.imei || "",
        regionInfo: data.regionInfo || "",
        wifiMacAddress: data.wifiMacAddress || "",
        bluetoothMacAddress: data.bluetoothMacAddress || "",
        activationStatus: data.activationStatus || "",
        batteryCycleCount: data.batteryCycleCount || 0,
        batteryManufacturer: data.batteryManufacturer || "",
        iosVersion: data.iosVersion || "",
        jailbreakStatus: data.jailbreakStatus || "Không xác định",
        batteryHealth: data.batteryHealth || 100,
        batteryVoltage: data.batteryVoltage || "",
        screen: data.screen || "NOT_TESTED",
        cameraFront: data.cameraFront || "NOT_TESTED",
        cameraBack: data.cameraBack || "NOT_TESTED",
        speaker: data.speaker || "NOT_TESTED",
        microphone: data.microphone || "NOT_TESTED",
        faceId: data.faceId || "NOT_TESTED",
        fingerprint: data.fingerprint || "NOT_TESTED",
        buttons: data.buttons || "NOT_TESTED",
        wifi: data.wifi || "NOT_TESTED",
        bluetooth: data.bluetooth || "NOT_TESTED",
        nfc: data.nfc || "NOT_TESTED",
        chargingPort: data.chargingPort || "NOT_TESTED",
        proximitySensor: data.proximitySensor || "NOT_TESTED",
        accelerometer: data.accelerometer || "NOT_TESTED",
        gyroscope: data.gyroscope || "NOT_TESTED",
        facetime: data.facetime || "NOT_TESTED",
        siri: data.siri || "NOT_TESTED",
        overallStatus: data.overallStatus || "",
        notes: data.notes || "",
      },
    }))
    setShowHealthUploader(false)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.brandId) newErrors.brandId = "Vui lòng chọn thương hiệu"
    if (!formData.modelId && !showCustomModel) newErrors.modelId = "Vui lòng chọn hoặc tạo mẫu điện thoại"
    if (showCustomModel && !customModelName.trim()) {
      newErrors.modelId = "Vui lòng nhập tên model"
    }
    if (!formData.title || formData.title.length < 10) newErrors.title = "Tiêu đề phải có ít nhất 10 ký tự"
    if (!formData.condition) newErrors.condition = "Vui lòng chọn tình trạng máy"
    if (!formData.warranty) newErrors.warranty = "Vui lòng chọn bảo hành"
    if (!formData.ramGb) newErrors.ramGb = "Vui lòng chọn RAM"
    if (!formData.storageGb) newErrors.storageGb = "Vui lòng chọn bộ nhớ"
    if (!formData.color) newErrors.color = "Vui lòng chọn màu sắc"
    if (!formData.batteryHealth) newErrors.batteryHealth = "Vui lòng nhập % pin"
    if (!formData.price || Number(formData.price) < 10000) newErrors.price = "Giá phải lớn hơn 10,000đ"
    if (!formData.images || formData.images.length === 0) newErrors.images = "Vui lòng thêm ít nhất 1 hình ảnh"
    if (formData.images && formData.images.length > 6) newErrors.images = "Tối đa 6 hình ảnh"

    // iPhone bắt buộc phải có health check
    if (isIphone && !formData.healthCheck.batteryHealth) {
      newErrors.healthCheck = "Vui lòng phân tích báo cáo 3uTools cho iPhone"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin sản phẩm */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Brand & Model - ngang hàng */}
              <div className="grid grid-cols-2 gap-4 items-start">
                {/* Brand */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Thương hiệu *</Label>
                  <Select
                    value={formData.brandId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, brandId: value }))}
                  >
                    <SelectTrigger style={{ marginTop: "2%" }} className={`h-10 ${errors.brandId ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Chọn thương hiệu" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.brandId && <p className="text-sm text-red-500">{errors.brandId}</p>}
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Model *</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-6 text-xs p-0 text-primary"
                      onClick={() => setShowCustomModel(!showCustomModel)}
                    >
                      {showCustomModel ? "Chọn có sẵn" : "+ Tạo mới"}
                    </Button>
                  </div>

                  {showCustomModel ? (
                    // Custom model input
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tên model</Label>
                          <Input
                            value={customModelName}
                            onChange={(e) => setCustomModelName(e.target.value)}
                            placeholder="VD: iPhone 15"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">RAM</Label>
                          <Select
                            value={customRam.toString()}
                            onValueChange={(v) => setCustomRam(parseInt(v))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RAM_OPTIONS.map((r) => (
                                <SelectItem key={r.value} value={r.value.toString()}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Storage</Label>
                          <Select
                            value={customStorage.toString()}
                            onValueChange={(v) => setCustomStorage(parseInt(v))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STORAGE_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s.toString()}>
                                  {s >= 1024 ? `${s / 1024}TB` : `${s}GB`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="w-full mt-2"
                        onClick={handleCreateCustomModel}
                        disabled={!customModelName.trim()}
                      >
                        + Tạo model
                      </Button>
                    </div>
                  ) : (
                    // Model dropdown
                    <Select
                      value={formData.modelId}
                      onValueChange={(value) => {
                        if (value === "__custom__") {
                          setShowCustomModel(true)
                        } else {
                          setFormData((prev) => ({ ...prev, modelId: value }))
                        }
                      }}
                      disabled={!formData.brandId}
                    >
                      <SelectTrigger className={`h-10 ${errors.modelId ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Chọn model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-primary font-medium">
                          + Tạo model mới
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {errors.modelId && <p className="text-sm text-red-500">{errors.modelId}</p>}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Tiêu đề *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="VD: iPhone 14 Pro Max 256GB Gold"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả thêm về sản phẩm (phụ kiện đi kèm, lý do bán,..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tình trạng máy & Bảo hành */}
          <Card>
            <CardHeader>
              <CardTitle>Tình trạng & Bảo hành</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Condition */}
                <div className="space-y-2">
                  <Label>Tình trạng máy *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger className={errors.condition ? "border-red-500" : ""}>
                      <SelectValue placeholder="Chọn tình trạng" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((cond) => (
                        <SelectItem key={cond.value} value={cond.value}>
                          <div>
                            <div className="font-medium">{cond.label}</div>
                            <div className="text-xs text-muted-foreground">{cond.desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.condition && <p className="text-sm text-red-500">{errors.condition}</p>}
                </div>

                {/* Warranty */}
                <div className="space-y-2">
                  <Label>Bảo hành *</Label>
                  <Select
                    value={formData.warranty}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, warranty: value }))}
                  >
                    <SelectTrigger className={errors.warranty ? "border-red-500" : ""}>
                      <SelectValue placeholder="Chọn bảo hành" />
                    </SelectTrigger>
                    <SelectContent>
                      {WARRANTIES.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          <div>
                            <div className="font-medium">{w.label}</div>
                            <div className="text-xs text-muted-foreground">{w.desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.warranty && <p className="text-sm text-red-500">{errors.warranty}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thông số kỹ thuật */}
          <Card>
            <CardHeader>
              <CardTitle>Thông số kỹ thuật</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* RAM */}
                <div className="space-y-2">
                  <Label>RAM *</Label>
                  <Select
                    value={formData.ramGb.toString()}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, ramGb: parseInt(value) }))}
                  >
                    <SelectTrigger className={errors.ramGb ? "border-red-500" : ""}>
                      <SelectValue placeholder="RAM" />
                    </SelectTrigger>
                    <SelectContent>
                      {RAM_OPTIONS.map((ram) => (
                        <SelectItem key={ram.value} value={ram.value.toString()}>
                          {ram.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.ramGb && <p className="text-sm text-red-500">{errors.ramGb}</p>}
                </div>

                {/* Storage */}
                <div className="space-y-2">
                  <Label>Bộ nhớ *</Label>
                  <Select
                    value={formData.storageGb.toString()}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, storageGb: parseInt(value) }))}
                  >
                    <SelectTrigger className={errors.storageGb ? "border-red-500" : ""}>
                      <SelectValue placeholder="Bộ nhớ" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORAGE_OPTIONS.map((storage) => (
                        <SelectItem key={storage} value={storage.toString()}>
                          {storage >= 1024 ? `${storage / 1024} TB` : `${storage} GB`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.storageGb && <p className="text-sm text-red-500">{errors.storageGb}</p>}
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label>Màu sắc *</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger className={errors.color ? "border-red-500" : ""}>
                      <SelectValue placeholder="Màu" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.color && <p className="text-sm text-red-500">{errors.color}</p>}
                </div>

                {/* Battery */}
                <div className="space-y-2">
                  <Label>% Pin *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.batteryHealth}
                    onChange={(e) => setFormData((prev) => ({ ...prev, batteryHealth: parseInt(e.target.value) || 0 }))}
                    placeholder="VD: 92"
                    className={errors.batteryHealth ? "border-red-500" : ""}
                  />
                  {errors.batteryHealth && <p className="text-sm text-red-500">{errors.batteryHealth}</p>}
                </div>
              </div>

              {/* IMEI */}
              <div className="space-y-2">
                <Label>IMEI (tùy chọn)</Label>
                <Input
                  value={formData.imei ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imei: e.target.value }))}
                  placeholder="15 chữ số"
                  maxLength={15}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hình ảnh */}
          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh sản phẩm</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tối đa 6 ảnh. Kéo thả để sắp xếp. Ảnh đầu tiên là ảnh chính.
              </p>
            </CardHeader>
            <CardContent>
              <ImageUploader
                images={formData.images ?? []}
                onChange={(images) =>
                  setFormData((prev) => ({
                    ...prev,
                    images: images as { url: string; isPrimary: boolean }[],
                  }))
                }
                maxImages={6}
              />
              {errors.images && <p className="text-sm text-red-500 mt-2">{errors.images}</p>}
            </CardContent>
          </Card>

          {/* Health Check - iPhone bắt buộc */}
          {isIphone ? (
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Kiểm tra thiết bị (Bắt buộc)
                  </CardTitle>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setShowHealthUploader(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Phân tích 3uTools
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload ảnh báo cáo từ 3uTools để AI phân tích tự động. Thông tin sau khi phân tích không thể chỉnh sửa.
                </p>
              </CardHeader>
              <CardContent>
                {/* iPhone Health Check Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  {formData.healthCheck.batteryHealth > 0 ? (
                    <>
                      {/* Device Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {formData.healthCheck.modelName && (
                          <div>
                            <p className="text-muted-foreground">Model</p>
                            <p className="font-medium">{formData.healthCheck.modelName}</p>
                          </div>
                        )}
                        {formData.healthCheck.serialNumber && (
                          <div>
                            <p className="text-muted-foreground">Serial</p>
                            <p className="font-medium">{formData.healthCheck.serialNumber}</p>
                          </div>
                        )}
                        {formData.healthCheck.activationStatus && (
                          <div>
                            <p className="text-muted-foreground">Kích hoạt</p>
                            <p className="font-medium">{formData.healthCheck.activationStatus}</p>
                          </div>
                        )}
                        {formData.healthCheck.batteryCycleCount > 0 && (
                          <div>
                            <p className="text-muted-foreground">Số lần sạc</p>
                            <p className="font-medium">{formData.healthCheck.batteryCycleCount}</p>
                          </div>
                        )}
                      </div>

                      {/* Battery & Main Components */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        <div className="bg-background rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Pin</p>
                          <p className="font-bold text-lg">{formData.healthCheck.batteryHealth}%</p>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${formData.healthCheck.screen === 'PASS' ? 'bg-green-100' : formData.healthCheck.screen === 'FAIL' ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Màn hình</p>
                          <p className="font-bold text-sm">{formData.healthCheck.screen === 'PASS' ? '✓' : formData.healthCheck.screen === 'FAIL' ? '✗' : '-'}</p>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${formData.healthCheck.cameraFront === 'PASS' ? 'bg-green-100' : formData.healthCheck.cameraFront === 'FAIL' ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Cam trước</p>
                          <p className="font-bold text-sm">{formData.healthCheck.cameraFront === 'PASS' ? '✓' : formData.healthCheck.cameraFront === 'FAIL' ? '✗' : '-'}</p>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${formData.healthCheck.cameraBack === 'PASS' ? 'bg-green-100' : formData.healthCheck.cameraBack === 'FAIL' ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Cam sau</p>
                          <p className="font-bold text-sm">{formData.healthCheck.cameraBack === 'PASS' ? '✓' : formData.healthCheck.cameraBack === 'FAIL' ? '✗' : '-'}</p>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${formData.healthCheck.faceId === 'PASS' ? 'bg-green-100' : formData.healthCheck.faceId === 'FAIL' ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Face ID</p>
                          <p className="font-bold text-sm">{formData.healthCheck.faceId === 'PASS' ? '✓' : formData.healthCheck.faceId === 'FAIL' ? '✗' : '-'}</p>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${formData.healthCheck.wifi === 'PASS' ? 'bg-green-100' : formData.healthCheck.wifi === 'FAIL' ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Wi-Fi</p>
                          <p className="font-bold text-sm">{formData.healthCheck.wifi === 'PASS' ? '✓' : formData.healthCheck.wifi === 'FAIL' ? '✗' : '-'}</p>
                        </div>
                      </div>

                      {/* All Components */}
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-1 text-xs">
                        {[
                          { key: 'speaker', label: 'Loa' },
                          { key: 'microphone', label: 'Micro' },
                          { key: 'fingerprint', label: 'Touch ID' },
                          { key: 'bluetooth', label: 'Bluetooth' },
                          { key: 'nfc', label: 'NFC' },
                          { key: 'chargingPort', label: 'Cổng sạc' },
                          { key: 'buttons', label: 'Nút bấm' },
                          { key: 'siri', label: 'Siri' },
                        ].map((item) => (
                          <div key={item.key} className={`rounded p-2 text-center ${formData.healthCheck[item.key as keyof typeof formData.healthCheck] === 'PASS' ? 'bg-green-50' : formData.healthCheck[item.key as keyof typeof formData.healthCheck] === 'FAIL' ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <p className="text-muted-foreground">{item.label}</p>
                            <p className="font-medium">{formData.healthCheck[item.key as keyof typeof formData.healthCheck] === 'PASS' ? '✓' : formData.healthCheck[item.key as keyof typeof formData.healthCheck] === 'FAIL' ? '✗' : '-'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {formData.healthCheck.notes && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Ghi chú:</p>
                          <p>{formData.healthCheck.notes}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Thông tin kiểm tra không thể chỉnh sửa. Upload lại ảnh để cập nhật.
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Chưa có thông tin kiểm tra</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload ảnh báo cáo từ 3uTools để AI phân tích
                      </p>
                      <Button type="button" onClick={() => setShowHealthUploader(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Phân tích ngay
                      </Button>
                    </div>
                  )}
                </div>
                {errors.healthCheck && <p className="text-sm text-red-500 mt-2">{errors.healthCheck}</p>}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Kiểm tra thiết bị (Tùy chọn)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tính năng kiểm tra tự động chỉ khả dụng cho iPhone
                </p>
              </CardHeader>
            </Card>
          )}

          {/* Giá */}
          <Card>
            <CardHeader>
              <CardTitle>Giá bán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giá bán (VNĐ) *</Label>
                  <Input
                    type="number"
                    min="10000"
                    step="1000"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    placeholder="VD: 15000000"
                    className={errors.price ? "border-red-500" : ""}
                  />
                  {formData.price && Number(formData.price) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {Number(formData.price).toLocaleString("vi-VN")} VNĐ
                    </p>
                  )}
                  {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
                </div>

                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="negotiable"
                      checked={formData.negotiable}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, negotiable: !!checked }))}
                    />
                    <Label htmlFor="negotiable" className="cursor-pointer">
                      Cho phép thương lượng giá
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
              Hủy
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : product ? (
                "Lưu thay đổi"
              ) : (
                "Đăng sản phẩm"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Health Uploader Dialog */}
      <Dialog open={showHealthUploader} onOpenChange={setShowHealthUploader}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Phân tích báo cáo 3uTools</DialogTitle>
          </DialogHeader>
          <DeviceHealthUploader
            onDataExtracted={handleHealthDataExtracted}
            onManualEntry={() => setShowHealthUploader(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
