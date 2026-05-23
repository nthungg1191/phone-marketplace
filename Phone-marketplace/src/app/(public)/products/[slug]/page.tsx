"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import {
  Star,
  ShoppingCart,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Battery,
  Cpu,
  HardDrive,
  Smartphone,
  Heart,
  Loader2,
  Flame,
  ZoomIn,
  Share2,
  BadgeCheck,
  TrendingUp,
  Clock,
  ExternalLink,
  MessageSquare,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/components/shared/toast"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  title: string
  slug: string
  description: string
  condition: string
  ramGb: number
  storageGb: number
  color: string
  batteryHealth: number
  price: string
  negotiable: boolean
  images: { id: string; url: string; isPrimary: boolean }[]
  brand: { id: string; name: string; slug: string }
  model: { id: string; name: string }
  category: { id: string; name: string }
  healthCheck: Record<string, string> | null
  viewCount?: number
  seller: {
    id: string
    name: string
    avatar: string | null
    sellerRank: string
    sellerStats: {
      avgRating: string
      totalTransactions: number
      successRate: string
    } | null
    createdAt: string
  }
  reviews: Array<{
    id: string
    rating: number
    comment: string
    createdAt: string
    reviewer: { id: string; name: string; avatar: string | null }
  }>
  _count: { reviews: number }
}

const conditionConfig: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  LIKE_NEW: {
    label: "Như mới",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    description: "99-100%, không có dấu hiệu sử dụng",
  },
  PERFECT_99: {
    label: "99%",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    description: "Tình trạng gần như hoàn hảo",
  },
  EXCELLENT_98: {
    label: "98%",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
    description: "Tình trạng xuất sắc, vài vết xước nhỏ",
  },
  EXCELLENT_97: {
    label: "97%",
    color: "text-teal-600",
    bgColor: "bg-teal-50 border-teal-200",
    description: "Tình trạng tốt, có thể có vết xước nhẹ",
  },
  GOOD: {
    label: "Dưới 97%",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Có dấu hiệu sử dụng rõ ràng hơn",
  },
}

const healthCheckLabels: Record<string, string> = {
  screen: "Màn hình",
  cameraFront: "Camera trước",
  cameraBack: "Camera sau",
  speaker: "Loa ngoài",
  microphone: "Micro",
  buttons: "Nút bấm",
  faceId: "Face ID",
  fingerprint: "Vân tay",
  wifi: "WiFi",
  bluetooth: "Bluetooth",
  chargingPort: "Cổng sạc",
}

const rankColors: Record<string, { bg: string; text: string; icon: string }> = {
  BRONZE: { bg: "bg-amber-100", text: "text-amber-700", icon: "🥉" },
  SILVER: { bg: "bg-slate-200", text: "text-slate-600", icon: "🥈" },
  GOLD: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🥇" },
  DIAMOND: { bg: "bg-cyan-100", text: "text-cyan-700", icon: "💎" },
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0)
  const [isZoomed, setIsZoomed] = React.useState(false)
  const [showContactModal, setShowContactModal] = React.useState(false)
  const [contactMessage, setContactMessage] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [addedToCart, setAddedToCart] = React.useState(false)
  const [isWishlisted, setIsWishlisted] = React.useState(false)
  const [wishlistLoading, setWishlistLoading] = React.useState(false)
  const [buyNowLoading, setBuyNowLoading] = React.useState(false)

  const slug = params.slug as string

  const { addToast } = useToast()

  React.useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/products/${slug}`)
        if (!res.ok) throw new Error("Không tìm thấy sản phẩm")
        const data = await res.json()
        setProduct(data.product)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi khi tải sản phẩm")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  React.useEffect(() => {
    const trackView = async () => {
      if (!product?.id) return
      const viewedKey = `viewed_product_${product.id}`
      if (sessionStorage.getItem(viewedKey)) return
      try {
        await fetch(`/api/products/${product.id}/view`, { method: "POST" })
        sessionStorage.setItem(viewedKey, "true")
      } catch {
        // silent fail
      }
    }
    trackView()
  }, [product?.id])

  React.useEffect(() => {
    const checkWishlist = async () => {
      if (!session?.user || !product?.id) return
      try {
        const res = await fetch("/api/wishlist")
        if (res.ok) {
          const data = await res.json()
          const isInWishlist = data.items?.some(
            (item: { product: { id: string } }) => item.product.id === product.id
          )
          setIsWishlisted(isInWishlist)
        }
      } catch {
        // silent fail
      }
    }
    checkWishlist()
  }, [session?.user, product?.id])

  const handleAddToCart = async () => {
    if (!session) { router.push("/auth/login"); return }
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product?.id }),
      })
      if (res.ok) {
        setAddedToCart(true)
        addToast("Đã thêm vào giỏ hàng!", "success")
        setTimeout(() => setAddedToCart(false), 3000)
        window.dispatchEvent(new Event("cart-updated"))
      } else {
        const data = await res.json()
        addToast(data.error || "Không thể thêm vào giỏ hàng", "error")
      }
    } catch {
      addToast("Có lỗi xảy ra, vui lòng thử lại", "error")
    }
  }

  const handleBuyNow = async () => {
    if (!session) { router.push("/auth/login"); return }
    if (!product?.id) return
    setBuyNowLoading(true)
    try {
      const res = await fetch("/api/cart/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) {
        window.dispatchEvent(new Event("cart-updated"))
        router.push("/checkout")
      } else {
        const data = await res.json()
        addToast(data.error || "Không thể mua ngay", "error")
      }
    } catch {
      addToast("Có lỗi xảy ra, vui lòng thử lại", "error")
    } finally {
      setBuyNowLoading(false)
    }
  }

  const handleContact = async () => {
    if (!session) { router.push("/auth/login"); return }
    if (!product?.seller?.id || !product?.id) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/messages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: product.seller.id,
          productId: product.id,
          initialMessage: contactMessage || `Xin chào! Tôi quan tâm đến sản phẩm "${product?.title}" của bạn.\n📱 Sản phẩm: ${product?.title}\n💰 Giá: ${Number(product?.price).toLocaleString("vi-VN")}đ\n🔗 Link: ${typeof window !== "undefined" ? window.location.origin : ""}/products/${product?.slug}`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const conversationId = data.conversation?.id || data.conversationId
        setShowContactModal(false)
        setContactMessage("")
        if (conversationId) {
          router.push(`/messages/${conversationId}`)
        }
      } else {
        const error = await res.json()
        addToast(error.error || "Có lỗi xảy ra", "error")
      }
    } catch {
      addToast("Có lỗi xảy ra, vui lòng thử lại", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleWishlist = async () => {
    if (!session) { router.push("/auth/login"); return }
    if (!product?.id) return
    setWishlistLoading(true)
    try {
      if (isWishlisted) {
        const res = await fetch(`/api/wishlist/${product.id}`, { method: "DELETE" })
        if (res.ok) {
          setIsWishlisted(false)
          addToast("Đã xóa khỏi yêu thích", "success")
        }
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        })
        if (res.ok) {
          setIsWishlisted(true)
          addToast("Đã thêm vào yêu thích", "success")
        } else {
          const data = await res.json()
          addToast(data.error || "Có lỗi xảy ra", "error")
        }
      }
    } catch {
      addToast("Có lỗi xảy ra, vui lòng thử lại", "error")
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: product?.title,
          text: `Xem sản phẩm này: ${product?.title}`,
          url: window.location.href,
        })
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      addToast("Đã sao chép link sản phẩm!", "success")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded-xl w-3/4 animate-pulse" />
              <div className="h-6 bg-muted rounded-xl w-1/2 animate-pulse" />
              <div className="h-12 bg-muted rounded-xl w-1/3 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <EmptyState
          icon={<Smartphone className="h-12 w-12" />}
          title="Không tìm thấy sản phẩm"
          description={error || "Sản phẩm này có thể đã bị xóa hoặc không tồn tại"}
          action={
            <Link href="/products">
              <Button>Quay lại danh sách sản phẩm</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const condition = conditionConfig[product.condition] || {
    label: product.condition,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    description: "",
  }
  const isOwner = session?.user?.id === product.seller.id
  const rankInfo = rankColors[product.seller.sellerRank] || rankColors.BRONZE
  const healthCheckEntries = product.healthCheck
    ? Object.entries(product.healthCheck).filter(([key]) => healthCheckLabels[key] && !key.includes("Note"))
    : []
  const healthPassCount = healthCheckEntries.filter(([, v]) => v === "PASS").length
  const healthPassRate = healthCheckEntries.length > 0 ? Math.round((healthPassCount / healthCheckEntries.length) * 100) : 0

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumb
          items={[
            { label: "Sản phẩm", href: "/products" },
            { label: product.brand.name, href: `/products?brandId=${product.brand.id}` },
            { label: product.title },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-background rounded-2xl border relative overflow-hidden group">
              {product.images[selectedImageIndex] ? (
                <>
                  <Image
                    src={product.images[selectedImageIndex].url}
                    alt={`${product.title} - Ảnh ${selectedImageIndex + 1}`}
                    fill
                    className="object-cover cursor-zoom-in"
                    onClick={() => setIsZoomed(true)}
                    priority
                  />
                  <button
                    onClick={() => setIsZoomed(true)}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-background/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Smartphone className="h-32 w-32 text-muted-foreground" />
                </div>
              )}

              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className={cn("backdrop-blur shadow-sm", condition.bgColor, condition.color)}>
                  {condition.label}
                </Badge>
                {product.negotiable && (
                  <Badge variant="secondary" className="backdrop-blur shadow-sm">
                    Có thể trả giá
                  </Badge>
                )}
              </div>
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                      selectedImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href={`/products?brandId=${product.brand.id}`} className="hover:text-foreground transition-colors">
                  {product.brand.name}
                </Link>
                <span>•</span>
                <span>{product.model.name}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">
                    {product.seller.sellerStats?.avgRating
                      ? Number(product.seller.sellerStats.avgRating).toFixed(1)
                      : "Mới"}
                  </span>
                  <span className="text-muted-foreground">({product._count.reviews} đánh giá)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{product.viewCount || 0} lượt xem</span>
                </div>
              </div>
            </div>

            {/* Price Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-4xl font-bold text-primary">
                    {Number(product.price).toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <Cpu className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">RAM</p>
                      <p className="font-semibold">{product.ramGb}GB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <HardDrive className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bộ nhớ</p>
                      <p className="font-semibold">{product.storageGb >= 1024 ? `${product.storageGb / 1024}TB` : `${product.storageGb}GB`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <Battery className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pin</p>
                      <p className="font-semibold">{product.batteryHealth}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <Palette className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Màu sắc</p>
                      <p className="font-semibold">{product.color}</p>
                    </div>
                  </div>
                </div>

                {!isOwner && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button size="lg" onClick={handleAddToCart} className="h-12">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {addedToCart ? "Đã thêm!" : "Thêm vào giỏ"}
                      </Button>
                      <Button
                        size="lg"
                        className="h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0"
                        onClick={handleBuyNow}
                        disabled={buyNowLoading}
                      >
                        {buyNowLoading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Flame className="h-5 w-5 mr-2" />
                        )}
                        Mua ngay
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12"
                        onClick={() => setShowContactModal(true)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Nhắn tin
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                        onClick={handleWishlist}
                        disabled={wishlistLoading}
                      >
                        <Heart className={cn("h-5 w-5", isWishlisted && "fill-red-500 text-red-500")} />
                      </Button>
                    </div>
                  </div>
                )}

                {isOwner && (
                  <div className="flex gap-3">
                    <Link href={`/seller/products/${product.id}/edit`} className="flex-1">
                      <Button variant="outline" size="lg" className="w-full">
                        Chỉnh sửa sản phẩm
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background border rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
                <Shield className="h-7 w-7 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Kiểm tra chất lượng</p>
              </div>
              <div className="bg-background border rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
                <Truck className="h-7 w-7 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Giao hàng nhanh</p>
              </div>
              <div className="bg-background border rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
                <RotateCcw className="h-7 w-7 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Đổi trả 7 ngày</p>
              </div>
            </div>

            {/* Seller Card */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  Người bán
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Link href={`/stores/${product.seller.id}`}>
                    <Avatar className="h-14 w-14 border-2 hover:ring-2 hover:ring-primary transition-all">
                      <AvatarImage src={product.seller.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {product.seller.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <Link href={`/stores/${product.seller.id}`} className="hover:text-primary transition-colors">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{product.seller.name}</p>
                        <Badge className={cn("text-xs", rankInfo.bg, rankInfo.text)}>
                          {rankInfo.icon} {product.seller.sellerRank}
                        </Badge>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">
                          {product.seller.sellerStats?.avgRating
                            ? Number(product.seller.sellerStats.avgRating).toFixed(1)
                            : "Mới"}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{product.seller.sellerStats?.totalTransactions || 0} giao dịch</span>
                    </div>
                  </div>
                </div>

                {product.seller.sellerStats && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Tỷ lệ thành công</p>
                      <p className="font-semibold text-lg">
                        {Number(product.seller.sellerStats.successRate).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tham gia</p>
                      <p className="font-semibold text-sm">
                        {new Date(product.seller.createdAt).toLocaleDateString("vi-VN", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                )}

                {!isOwner && (
                  <Button variant="outline" className="w-full" onClick={() => setShowContactModal(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Liên hệ người bán
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-8">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Mô tả
              </TabsTrigger>
              <TabsTrigger
                value="health"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Kiểm tra chất lượng
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Đánh giá ({product._count.reviews})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  {product.description ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{product.description}</p>
                  ) : (
                    <p className="text-muted-foreground">Người bán chưa cung cấp mô tả cho sản phẩm này.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="mt-6">
              {healthCheckEntries.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">Kết quả kiểm tra chất lượng</h3>
                        <p className="text-sm text-muted-foreground">Được thực hiện bởi hệ thống EUT</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{healthPassRate}%</p>
                        <p className="text-xs text-muted-foreground">Đạt</p>
                      </div>
                    </div>
                    <Progress value={healthPassRate} className="h-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {healthCheckEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-colors",
                            value === "PASS" && "bg-green-50 border-green-200",
                            value === "FAIL" && "bg-red-50 border-red-200",
                            value !== "PASS" && value !== "FAIL" && "bg-muted/50 border-muted"
                          )}
                        >
                          <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center">
                            {value === "PASS" ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : value === "FAIL" ? (
                              <XCircle className="h-6 w-6 text-red-600" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-yellow-600" />
                            )}
                          </div>
                          <p className="text-sm font-medium">{healthCheckLabels[key]}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {value === "PASS" ? "Hoàn hảo" : value === "FAIL" ? "Cần sửa chữa" : "Chưa kiểm tra"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Chưa có kiểm tra chất lượng</h3>
                    <p className="text-sm text-muted-foreground">
                      Sản phẩm này chưa được kiểm tra bởi hệ thống EUT.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              {product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map(review => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarImage src={review.reviewer.avatar || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {review.reviewer.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold">{review.reviewer.name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                                {review.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Chưa có đánh giá</h3>
                    <p className="text-sm text-muted-foreground">
                      Hãy là người đầu tiên đánh giá sản phẩm này!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Liên hệ người bán
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <Avatar>
                <AvatarImage src={product.seller.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {product.seller.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{product.seller.name}</p>
                <p className="text-sm text-muted-foreground">{product.title}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactMessage">Lời nhắn của bạn</Label>
              <Textarea
                id="contactMessage"
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                placeholder="Xin chào! Tôi quan tâm đến sản phẩm này..."
                rows={4}
              />
            </div>
            <Button onClick={handleContact} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Gửi tin nhắn
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
          <div className="relative aspect-square">
            {product.images[selectedImageIndex] && (
              <Image
                src={product.images[selectedImageIndex].url}
                alt={`${product.title} - Ảnh phóng to`}
                fill
                className="object-contain"
              />
            )}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-background/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-background"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-background/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-background"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {product.images.length}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Missing icon components
function Eye({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function Palette({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}
