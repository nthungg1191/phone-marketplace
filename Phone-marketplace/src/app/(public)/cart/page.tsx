"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Breadcrumb } from "@/components/shared/breadcrumb"

interface CartItem {
  id: string
  quantity: number
  product: {
    id: string
    title: string
    slug: string
    price: string | number
    stock: number | null
    images: { url: string; isPrimary: boolean }[]
    brand: { name: string }
    seller: { name: string }
  }
}

export default function CartPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [items, setItems] = React.useState<CartItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState<string | null>(null)
  const [removing, setRemoving] = React.useState<string | null>(null)

  // Checkout form
  const [showCheckout, setShowCheckout] = React.useState(false)
  const [fullName, setFullName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [street, setStreet] = React.useState("")
  const [ward, setWard] = React.useState("")
  const [district, setDistrict] = React.useState("")
  const [city, setCity] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<"SEPAY" | "COD">("COD")
  const [submitting, setSubmitting] = React.useState(false)

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.product.price) * item.quantity
  }, 0)
  const shippingFee = 0 // Miễn phí vận chuyển
  const total = subtotal + shippingFee

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/cart")
      return
    }

    if (status === "authenticated") {
      fetchCart()
    }
  }, [status, router])

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
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveItem = async (productId: string) => {
    setRemoving(productId)
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 0 }),
      })

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.product.id !== productId))
      }
    } catch (error) {
      console.error("Error removing item:", error)
    } finally {
      setRemoving(null)
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !phone || !street || !ward || !district || !city) {
      alert("Vui lòng điền đầy đủ thông tin giao hàng")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          shippingAddress: `${fullName}, ${street}, ${ward}, ${district}, ${city}`,
          phone,
          paymentMethod,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        alert("Đặt hàng thành công!")
        router.push(`/orders/${data.order.id}`)
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error creating order:", error)
      alert("Có lỗi xảy ra, vui lòng thử lại")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
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

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Giỏ hàng" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Giỏ hàng</h1>
          <span className="text-muted-foreground">
            {items.length} sản phẩm
          </span>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Giỏ hàng trống</h2>
              <p className="text-muted-foreground mb-6">Hãy thêm sản phẩm vào giỏ hàng</p>
              <Link href="/products">
                <Button>Khám phá sản phẩm</Button>
              </Link>
            </CardContent>
          </Card>
        ) : showCheckout ? (
          // Checkout Form
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin giao hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCheckout} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Họ tên người nhận *</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Số điện thoại *</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0912 345 678"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="street">Địa chỉ (số nhà, đường) *</Label>
                      <Input
                        id="street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="123 Đường ABC, Phường XYZ"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ward">Phường/Xã *</Label>
                        <Input
                          id="ward"
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          placeholder="Phường 1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district">Quận/Huyện *</Label>
                        <Input
                          id="district"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="Quận 1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Tỉnh/Thành phố *</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="TP. Hồ Chí Minh"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Phương thức thanh toán</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("COD")}
                          className={`p-4 border rounded-lg text-left ${
                            paymentMethod === "COD"
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          <p className="font-medium">COD</p>
                          <p className="text-sm text-muted-foreground">Thanh toán khi nhận hàng</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("SEPAY")}
                          className={`p-4 border rounded-lg text-left ${
                            paymentMethod === "SEPAY"
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          <p className="font-medium">Sepay</p>
                          <p className="text-sm text-muted-foreground">Thanh toán qua ví điện tử</p>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCheckout(false)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại
                      </Button>
                      <Button type="submit" className="flex-1" disabled={submitting}>
                        {submitting ? "Đang xử lý..." : "Đặt hàng ngay"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-16 h-16 bg-muted rounded overflow-hidden shrink-0">
                          {item.product.images[0] ? (
                            <img
                              src={item.product.images[0].url}
                              alt={item.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Smartphone className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{item.product.title}</p>
                          <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                          <p className="text-sm text-primary font-semibold">
                            {(Number(item.product.price) * item.quantity).toLocaleString("vi-VN")}đ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tạm tính</span>
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
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Cart Items
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Link href={`/products/${item.product.slug}`} className="shrink-0">
                        <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden">
                          {item.product.images[0] ? (
                            <img
                              src={item.product.images[0].url}
                              alt={item.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Smartphone className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          <Link href={`/products/${item.product.slug}`}>
                            <h3 className="font-semibold line-clamp-2 hover:text-primary">
                              {item.product.title}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.product.brand.name} • {item.product.seller.name}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                          {Number(item.product.price).toLocaleString("vi-VN")}đ
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex flex-col items-end justify-between min-w-[120px]">
                        <button
                          onClick={() => handleRemoveItem(item.product.id)}
                          disabled={removing === item.product.id}
                          className="text-red-500 hover:text-red-600 p-2"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            disabled={updating === item.product.id || item.quantity <= 1}
                            className="h-8 w-8 flex items-center justify-center rounded border hover:bg-muted disabled:opacity-50 shrink-0"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="w-12 h-8 flex items-center justify-center">
                            <span className="text-center font-medium w-full">
                              {item.quantity}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={updating === item.product.id || item.quantity >= 10}
                            className="h-8 w-8 flex items-center justify-center rounded border hover:bg-muted disabled:opacity-50 shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="font-semibold text-primary">
                          {(Number(item.product.price) * item.quantity).toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tạm tính ({items.length} sản phẩm)</span>
                      <span>{subtotal.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Phí vận chuyển</span>
                      <span className="text-green-600">Miễn phí</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Tổng cộng</span>
                      <span className="text-primary">{total.toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>

                  <Link href="/checkout" className="w-full">
                    <Button className="w-full" size="lg">
                      Tiến hành đặt hàng
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  <Link href="/products" className="block">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Tiếp tục mua sắm
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
