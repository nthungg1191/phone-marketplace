"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ShoppingCart,
  MapPin,
  CreditCard,
  Check,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Smartphone,
  Package,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/shared/toast"

interface CartItem {
  id: string
  quantity: number
  offerId?: string
  product: {
    id: string
    title: string
    slug: string
    price: number
    originalPrice?: number
    stock: number | null
    images: { url: string; isPrimary: boolean }[]
    brand: { name: string }
    seller: { id: string; name: string }
  }
}

interface SavedAddress {
  id: string
  fullName: string
  phone: string
  street: string
  provinceName: string
  wardName: string
  district: string
  city: string
  isDefault: boolean
}

interface ShippingAddress {
  fullName: string
  phone: string
  street: string
  ward: string
  district: string
  city: string
}

const STEPS = [
  { id: 1, label: "Giỏ hàng", icon: ShoppingCart },
  { id: 2, label: "Giao hàng", icon: MapPin },
  { id: 3, label: "Thanh toán", icon: CreditCard },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { addToast } = useToast()

  const [currentStep, setCurrentStep] = React.useState(1)
  const [items, setItems] = React.useState<CartItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState<string | null>(null)

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = React.useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = React.useState(false)
  const [savingAddress, setSavingAddress] = React.useState(false)

  // Shipping form
  const [shippingAddress, setShippingAddress] = React.useState<ShippingAddress>({
    fullName: "",
    phone: "",
    street: "",
    ward: "",
    district: "",
    city: "",
  })

  // Payment method
  const [paymentMethod, setPaymentMethod] = React.useState<"COD" | "SEPAY">("COD")
  const [submitting, setSubmitting] = React.useState(false)

  // Calculated totals
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.product.price) * item.quantity
  }, 0)
  const shippingFee = 0
  const total = subtotal + shippingFee

  // Selected address object
  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/checkout")
      return
    }

    if (status === "authenticated") {
      fetchCart()
      fetchAddresses()
      if (session?.user) {
        setShippingAddress((prev) => ({
          ...prev,
          fullName: session.user.name || "",
        }))
      }
    }
  }, [status, router, session])

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart")
      if (res.ok) {
        const data = await res.json()
        setItems(data.cart?.items || [])
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/addresses")
      if (res.ok) {
        const data = await res.json()
        setSavedAddresses(data.addresses || [])
        // Select default address if exists
        const defaultAddr = data.addresses?.find((a: SavedAddress) => a.isDefault)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
        }
      }
    } catch (error) {
      console.error("Error fetching addresses:", error)
    }
  }

  const handleSaveNewAddress = async () => {
    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city) {
      addToast("Vui lòng điền đầy đủ thông tin", "error")
      return
    }

    setSavingAddress(true)
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shippingAddress,
          provinceName: shippingAddress.city,
          provinceCode: "unknown",
          wardCode: "unknown",
          wardName: shippingAddress.ward,
          isDefault: savedAddresses.length === 0,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSavedAddresses(prev => [...prev, data.address])
        setSelectedAddressId(data.address.id)
        setShowNewAddressForm(false)
        addToast("Đã lưu địa chỉ mới", "success")
      } else {
        const data = await res.json()
        addToast(data.error || "Không thể lưu địa chỉ", "error")
      }
    } catch (error) {
      addToast("Có lỗi xảy ra", "error")
    } finally {
      setSavingAddress(false)
    }
  }

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 10) return

    setUpdating(productId)
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQuantity }),
      })

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.product.id === productId ? { ...item, quantity: newQuantity } : item
          )
        )
      } else {
        const data = await res.json()
        addToast(data.error || "Có lỗi xảy ra", "error")
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveItem = async (productId: string) => {
    setUpdating(productId)
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 0 }),
      })

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.product.id !== productId))
        addToast("Đã xóa sản phẩm", "success")
      }
    } catch (error) {
      console.error("Error removing item:", error)
    } finally {
      setUpdating(null)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 1 && items.length === 0) {
      addToast("Giỏ hàng trống", "error")
      return
    }
    if (currentStep === 2) {
      // Validate shipping
      const addressToUse = showNewAddressForm ? shippingAddress : selectedAddress
      if (showNewAddressForm) {
        if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city) {
          addToast("Vui lòng điền đầy đủ thông tin giao hàng", "error")
          return
        }
      } else if (!selectedAddressId || !addressToUse) {
        addToast("Vui lòng chọn địa chỉ giao hàng", "error")
        return
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3))
  }

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handlePlaceOrder = async () => {
    setSubmitting(true)
    try {
      // Build shipping address string
      let addressStr = ""
      if (showNewAddressForm) {
        addressStr = `${shippingAddress.fullName}, ${shippingAddress.phone}, ${shippingAddress.street}, ${shippingAddress.ward}, ${shippingAddress.district}, ${shippingAddress.city}`
      } else if (selectedAddress) {
        addressStr = `${selectedAddress.fullName}, ${selectedAddress.phone}, ${selectedAddress.street}, ${selectedAddress.wardName}, ${selectedAddress.district}, ${selectedAddress.provinceName || selectedAddress.city}`
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          shippingAddress: addressStr,
          paymentMethod,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const orderId = data.order.id

        // Nếu là thanh toán Banking Online, chuyển hướng đến trang thanh toán
        if (paymentMethod === "SEPAY") {
          const sepayRes = await fetch("/api/sepay/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          })

          if (sepayRes.ok) {
            const sepayData = await sepayRes.json()

            if (sepayData.checkoutUrl && sepayData.formFields) {
              // Tạo form để submit lên cổng thanh toán
              const form = document.createElement("form")
              form.method = "POST"
              form.action = sepayData.checkoutUrl

              Object.entries(sepayData.formFields).forEach(([key, value]) => {
                const input = document.createElement("input")
                input.type = "hidden"
                input.name = key
                input.value = value as string
                form.appendChild(input)
              })

              document.body.appendChild(form)
              form.submit()
              return // Không redirect sau khi submit form
            }
          } else {
            const sepayError = await sepayRes.json()
            addToast(sepayError.error || "Không thể tạo thanh toán online", "error")
            setSubmitting(false)
            return
          }
        }

        addToast("Đặt hàng thành công!", "success")
        router.push(`/orders/${data.order.id}`)
      } else {
        const data = await res.json()
        addToast(data.error || "Có lỗi xảy ra", "error")
      }
    } catch (error) {
      console.error("Error placing order:", error)
      addToast("Có lỗi xảy ra, vui lòng thử lại", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const formatAddress = (addr: SavedAddress) => {
    const parts = [
      addr.street,
      addr.wardName,
      addr.district,
      addr.provinceName || addr.city,
    ].filter(Boolean)
    return parts.join(", ")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded w-64 mx-auto" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">Thanh toán</h1>
            <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground">
              ← Quay lại giỏ hàng
            </Link>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-16 mx-2 ${
                        currentStep > step.id ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Cart Review */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Xem lại giỏ hàng
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Giỏ hàng trống</p>
                      <Link href="/products">
                        <Button>Khám phá sản phẩm</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                          <Link href={`/products/${item.product.slug}`}>
                            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                              {item.product.images[0] ? (
                                <img
                                  src={item.product.images[0].url}
                                  alt={item.product.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Smartphone className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${item.product.slug}`}>
                              <h3 className="font-medium line-clamp-2 hover:text-primary">
                                {item.product.title}
                              </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {item.product.brand.name} • {item.product.seller.name}
                            </p>
                            <p className="font-bold text-primary mt-1">
                              {item.product.price.toLocaleString("vi-VN")}đ
                            </p>
                          </div>

                          <div className="flex flex-col items-end justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.product.id)}
                              disabled={updating === item.product.id}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                                disabled={updating === item.product.id || item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                                disabled={updating === item.product.id || item.quantity >= 10}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Shipping */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Saved Addresses */}
                {savedAddresses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Chọn địa chỉ giao hàng
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {savedAddresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedAddressId === addr.id && !showNewAddressForm
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground"
                            }`}
                            onClick={() => {
                              setSelectedAddressId(addr.id)
                              setShowNewAddressForm(false)
                            }}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              selectedAddressId === addr.id && !showNewAddressForm
                                ? "border-primary"
                                : "border-muted-foreground"
                            }`}>
                              {selectedAddressId === addr.id && !showNewAddressForm && (
                                <div className="w-3 h-3 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{addr.fullName}</p>
                                <span className="text-muted-foreground">•</span>
                                <p className="text-muted-foreground">{addr.phone}</p>
                                {addr.isDefault && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatAddress(addr)}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Add new address option */}
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            showNewAddressForm
                              ? "border-primary bg-primary/5"
                              : "border-dashed hover:border-muted-foreground"
                          }`}
                          onClick={() => {
                            setSelectedAddressId(null)
                            setShowNewAddressForm(true)
                          }}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Plus className="h-4 w-4" />
                            <span>Thêm địa chỉ mới</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* New Address Form */}
                {showNewAddressForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Thông tin giao hàng mới</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Họ tên người nhận *</Label>
                          <Input
                            id="fullName"
                            value={shippingAddress.fullName}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, fullName: e.target.value }))
                            }
                            placeholder="Nguyễn Văn A"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Số điện thoại *</Label>
                          <Input
                            id="phone"
                            value={shippingAddress.phone}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            placeholder="0912 345 678"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="street">Địa chỉ (số nhà, đường) *</Label>
                        <Input
                          id="street"
                          value={shippingAddress.street}
                          onChange={(e) =>
                            setShippingAddress((prev) => ({ ...prev, street: e.target.value }))
                          }
                          placeholder="123 Đường ABC, Phường XYZ"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ward">Phường/Xã</Label>
                          <Input
                            id="ward"
                            value={shippingAddress.ward}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, ward: e.target.value }))
                            }
                            placeholder="Phường 1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="district">Quận/Huyện</Label>
                          <Input
                            id="district"
                            value={shippingAddress.district}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, district: e.target.value }))
                            }
                            placeholder="Quận 1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Tỉnh/Thành phố *</Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            placeholder="TP. Hồ Chí Minh"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveNewAddress}
                        disabled={savingAddress}
                        className="w-full"
                      >
                        {savingAddress && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Lưu địa chỉ này
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* No saved addresses - show form directly */}
                {savedAddresses.length === 0 && !showNewAddressForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Thông tin giao hàng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Họ tên người nhận *</Label>
                          <Input
                            id="fullName"
                            value={shippingAddress.fullName}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, fullName: e.target.value }))
                            }
                            placeholder="Nguyễn Văn A"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Số điện thoại *</Label>
                          <Input
                            id="phone"
                            value={shippingAddress.phone}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            placeholder="0912 345 678"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="street">Địa chỉ (số nhà, đường) *</Label>
                        <Input
                          id="street"
                          value={shippingAddress.street}
                          onChange={(e) =>
                            setShippingAddress((prev) => ({ ...prev, street: e.target.value }))
                          }
                          placeholder="123 Đường ABC, Phường XYZ"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ward">Phường/Xã</Label>
                          <Input
                            id="ward"
                            value={shippingAddress.ward}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, ward: e.target.value }))
                            }
                            placeholder="Phường 1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="district">Quận/Huyện</Label>
                          <Input
                            id="district"
                            value={shippingAddress.district}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, district: e.target.value }))
                            }
                            placeholder="Quận 1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Tỉnh/Thành phố *</Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            placeholder="TP. Hồ Chí Minh"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Phương thức thanh toán
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("COD")}
                      className={`p-4 border rounded-lg text-left ${
                        paymentMethod === "COD"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "COD" ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {paymentMethod === "COD" && (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">COD</p>
                          <p className="text-sm text-muted-foreground">Thanh toán khi nhận hàng</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("SEPAY")}
                      className={`p-4 border rounded-lg text-left ${
                        paymentMethod === "SEPAY"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "SEPAY" ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {paymentMethod === "SEPAY" && (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Banking Online</p>
                          <p className="text-sm text-muted-foreground">Thanh toán chuyển khoản qua Ngân hàng </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === "SEPAY" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        Sau khi đặt hàng, bạn sẽ được chuyển đến trang thanh toán để hoàn tất.
                      </p>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium mb-3">Đơn hàng của bạn</h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.product.title} x{item.quantity}
                          </span>
                          <span>
                            {(item.product.price * item.quantity).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>

              {currentStep < 3 ? (
                <Button onClick={handleNextStep}>
                  Tiếp tục
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handlePlaceOrder} disabled={submitting}>
                  {submitting ? "Đang xử lý..." : "Đặt hàng ngay"}
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar - Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Tóm tắt đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-14 h-14 bg-muted rounded overflow-hidden shrink-0">
                        {item.product.images[0] ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.product.title}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        <p className="text-sm font-semibold text-primary">
                          {(item.product.price * item.quantity).toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tạm tính ({items.length} sản phẩm)</span>
                    <span>{subtotal.toLocaleString("vi-VN")}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Phí vận chuyển</span>
                    <span className="text-green-600">Miễn phí</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Tổng cộng</span>
                    <span className="text-primary">{total.toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>

                {/* Shipping Address Preview */}
                {(selectedAddress || showNewAddressForm) && currentStep >= 2 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-1">Giao đến:</p>
                    {showNewAddressForm ? (
                      <p className="text-xs text-muted-foreground">
                        {shippingAddress.fullName || "Chưa nhập"} • {shippingAddress.phone || "..."}
                        <br />
                        {shippingAddress.street || "..."}
                        {shippingAddress.ward && `, ${shippingAddress.ward}`}
                        {shippingAddress.district && `, ${shippingAddress.district}`}
                        {shippingAddress.city && `, ${shippingAddress.city}`}
                      </p>
                    ) : selectedAddress ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedAddress.fullName} • {selectedAddress.phone}
                        <br />
                        {formatAddress(selectedAddress)}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Payment Method Preview */}
                {currentStep >= 3 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-1">Thanh toán:</p>
                    <p className="text-xs text-muted-foreground">
                      {paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : "Sepay - Ví điện tử"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
