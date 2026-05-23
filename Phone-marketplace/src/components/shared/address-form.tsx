"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface AddressFormData {
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

interface Province {
  code: string
  name: string
  codename: string
  division_type: string
  phone_code?: number
}

interface Ward {
  code: string
  name: string
  codename: string
  division_type: string
  province_code?: string
  district_code?: string
}

interface AddressFormProps {
  initialData?: Partial<AddressFormData>
  onSubmit: (data: AddressFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
  className?: string
}

export default function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = "Lưu địa chỉ",
  className,
}: AddressFormProps) {
  const [formData, setFormData] = React.useState<AddressFormData>({
    fullName: initialData?.fullName || "",
    phone: initialData?.phone || "",
    street: initialData?.street || "",
    provinceCode: initialData?.provinceCode || "",
    provinceName: initialData?.provinceName || "",
    wardCode: initialData?.wardCode || "",
    wardName: initialData?.wardName || "",
    district: initialData?.district || "",
    city: initialData?.city || "",
    isDefault: initialData?.isDefault || false,
  })

  const [provinces, setProvinces] = React.useState<Province[]>([])
  const [wards, setWards] = React.useState<Ward[]>([])
  const [loadingProvinces, setLoadingProvinces] = React.useState(false)
  const [loadingWards, setLoadingWards] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [showAllProvinces, setShowAllProvinces] = React.useState(false)

  // Fetch provinces on mount
  React.useEffect(() => {
    fetchProvinces()
  }, [])

  // Fetch wards when province changes
  React.useEffect(() => {
    if (formData.provinceCode) {
      fetchWards(formData.provinceCode)
    } else {
      setWards([])
      setFormData((prev) => ({ ...prev, wardCode: "", wardName: "" }))
    }
  }, [formData.provinceCode])

  const fetchProvinces = async () => {
    try {
      setLoadingProvinces(true)
      const url = "/api/vietnam-address?type=provinces&limit=100"
      console.log(`[AddressForm] fetchProvinces: ${url}`)
      const res = await fetch(url)
      console.log(`[AddressForm] provinces status=${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`[AddressForm] provinces: isArray=${Array.isArray(data)}, length=${Array.isArray(data) ? data.length : "N/A"}`)
        console.log(`[AddressForm] provinces sample:`, Array.isArray(data) ? data[0] : data)
        setProvinces(Array.isArray(data) ? data : [])
      } else {
        const text = await res.text()
        console.error(`[AddressForm] provinces error: ${text}`)
      }
    } catch (error) {
      console.error("Error fetching provinces:", error)
    } finally {
      setLoadingProvinces(false)
    }
  }

  const fetchWards = async (provinceCode: string) => {
    try {
      setLoadingWards(true)
      setWards([])
      console.log(`[AddressForm] fetchWards called with provinceCode=${provinceCode}`)
      // Lay tat ca wards cua tinh (cau truc moi: wards truc tiep thuoc tinh, bo qua cap quan/huyen)
      const url = `/api/vietnam-address?type=wards&provinceCode=${provinceCode}`
      console.log(`[AddressForm] fetching: ${url}`)
      const res = await fetch(url)
      console.log(`[AddressForm] response status=${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`[AddressForm] wards response type=${typeof data}, isArray=${Array.isArray(data)}, length=${Array.isArray(data) ? data.length : "N/A"}`)
        console.log(`[AddressForm] wards sample:`, Array.isArray(data) ? data[0] : data)
        setWards(Array.isArray(data) ? data : [])
      } else {
        const text = await res.text()
        console.error(`[AddressForm] wards error: ${text}`)
        setWards([])
      }
    } catch (error) {
      console.error("[AddressForm] fetchWards error:", error)
      setWards([])
    } finally {
      setLoadingWards(false)
    }
  }

  const handleProvinceChange = (code: string) => {
    const province = provinces.find((p) => p.code.toString() === code)
    if (province) {
      setFormData((prev) => ({
        ...prev,
        provinceCode: province.code.toString(),
        provinceName: province.name,
        wardCode: "",
        wardName: "",
        district: "",
        city: province.name,
      }))
    }
  }

  const handleWardChange = (code: string) => {
    const ward = wards.find((w) => w.code.toString() === code)
    if (ward) {
      setFormData((prev) => ({
        ...prev,
        wardCode: ward.code.toString(),
        wardName: ward.name,
      }))
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
    setFormData((prev) => ({ ...prev, phone: value }))
    if (value && !/^0[0-9]{9}$/.test(value)) {
      setErrors((prev) => ({ ...prev, phone: "Số điện thoại phải 10 số, bắt đầu bằng số 0" }))
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      newErrors.fullName = "Họ tên phải ít nhất 2 ký tự"
    }
    if (!formData.phone) {
      newErrors.phone = "Vui lòng nhập số điện thoại"
    } else if (!/^0[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = "Số điện thoại phải 10 số, bắt đầu bằng số 0"
    }
    if (!formData.street.trim() || formData.street.length < 5) {
      newErrors.street = "Địa chỉ phải ít nhất 5 ký tự"
    }
    if (!formData.provinceCode) {
      newErrors.provinceCode = "Vui lòng chọn tỉnh/thành phố"
    }
    if (!formData.wardCode) {
      newErrors.wardCode = "Vui lòng chọn phường/xã"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const displayedProvinces = showAllProvinces ? provinces : provinces.slice(0, 20)

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {/* Ho ten & SĐT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">
            Họ tên người nhận <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="VD: Nguyễn Văn A"
            className={errors.fullName ? "border-red-500" : ""}
          />
          {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Số điện thoại <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="0912345678"
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        </div>
      </div>

      {/* Tinh/Thanh pho */}
      <div className="space-y-2">
        <Label>
          Tỉnh/Thành phố <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.provinceCode}
          onValueChange={handleProvinceChange}
        >
          <SelectTrigger className={errors.provinceCode ? "border-red-500" : ""}>
            <SelectValue placeholder={loadingProvinces ? "Đang tải..." : "Chọn tỉnh/thành phố"} />
          </SelectTrigger>
          <SelectContent>
            {displayedProvinces.map((province) => (
              <SelectItem
                key={province.code}
                value={province.code.toString()}
              >
                {province.name}
              </SelectItem>
            ))}
            {provinces.length > 20 && (
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center text-primary text-sm"
                onClick={() => setShowAllProvinces(!showAllProvinces)}
              >
                {showAllProvinces ? "Thu gọn" : `Xem thêm ${provinces.length - 20} tỉnh/thành`}
              </Button>
            )}
          </SelectContent>
        </Select>
        {errors.provinceCode && <p className="text-sm text-red-500">{errors.provinceCode}</p>}
      </div>

      {/* Phuong/Xa */}
      <div className="space-y-2">
        <Label>
          Phường/Xã <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.wardCode}
          onValueChange={handleWardChange}
          disabled={!formData.provinceCode || loadingWards}
        >
          <SelectTrigger className={errors.wardCode ? "border-red-500" : ""}>
            <SelectValue
              placeholder={
                loadingWards
                  ? "Đang tải..."
                  : !formData.provinceCode
                  ? "Chọn tỉnh trước"
                  : "Chọn phường/xã"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {loadingWards ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
              </div>
            ) : (
              wards.map((ward) => (
                <SelectItem
                  key={ward.code}
                  value={ward.code.toString()}
                >
                  {ward.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.wardCode && <p className="text-sm text-red-500">{errors.wardCode}</p>}
      </div>

      {/* Dia chi cu the (so nha, duong) */}
      <div className="space-y-2">
        <Label htmlFor="street">
          Địa chỉ cụ thể <span className="text-red-500">*</span>
        </Label>
        <Input
          id="street"
          value={formData.street}
          onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
          placeholder="VD: 123 Nguyễn Trãi, P. Bến Thành"
          className={errors.street ? "border-red-500" : ""}
        />
        {errors.street && <p className="text-sm text-red-500">{errors.street}</p>}
      </div>

      {/* Dia chi day du (hien thi) */}
      {formData.provinceCode && formData.wardCode && formData.street && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">Địa chỉ đầy đủ:</p>
          <p className="text-sm font-medium">
            {formData.street}, {formData.wardName}, {formData.provinceName}
          </p>
        </div>
      )}

      {/* Dat mac dinh */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isDefault: !!checked }))}
        />
        <Label htmlFor="isDefault" className="cursor-pointer">
          Đặt làm địa chỉ giao hàng mặc định
        </Label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
