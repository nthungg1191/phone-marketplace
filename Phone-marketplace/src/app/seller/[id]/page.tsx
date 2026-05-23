"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Star,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle,
  MessageCircle,
  BadgeCheck,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SellerStats {
  avgRating: number | null
  totalTransactions: number | null
  successRate: string | null
  totalReviews: number | null
}

interface Seller {
  id: string
  name: string
  email: string
  avatar: string | null
  phone: string | null
  sellerRank: string
  sellerStatus: string
  createdAt: string
  sellerStats: SellerStats | null
}

interface Product {
  id: string
  title: string
  slug: string
  price: string
  condition: string
  images: { id: string; url: string; isPrimary: boolean }[]
  brand: { id: string; name: string; slug: string }
  category: { id: string; name: string }
  _count: { reviews: number }
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewer: { id: string; name: string; avatar: string | null }
  product: { id: string; title: string; images: { id: string; url: string; isPrimary: boolean }[] }
}

const rankConfig: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "Mới", color: "text-gray-600", bg: "bg-gray-100" },
  BRONZE: { label: "Đồng", color: "text-amber-700", bg: "bg-amber-100" },
  SILVER: { label: "Bạc", color: "text-slate-600", bg: "bg-slate-100" },
  GOLD: { label: "Vàng", color: "text-yellow-600", bg: "bg-yellow-100" },
  PLATINUM: { label: "Bạch Kim", color: "text-purple-600", bg: "bg-purple-100" },
}

const conditionLabels: Record<string, string> = {
  LIKE_NEW: "Như mới",
  PERFECT_99: "99%",
  EXCELLENT_98: "98%",
  EXCELLENT_97: "97%",
  GOOD: "Dưới 97%",
}

export default function SellerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const sellerId = params.id as string

  const [seller, setSeller] = React.useState<Seller | null>(null)
  const [products, setProducts] = React.useState<Product[]>([])
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Carousel refs
  const productScrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const fetchSellerProfile = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/sellers/${sellerId}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Không tìm thấy người bán")
          return
        }
        const data = await res.json()
        setSeller(data.seller)
        setProducts(data.products)
        setReviews(data.reviews)
      } catch {
        setError("Lỗi khi tải thông tin")
      } finally {
        setLoading(false)
      }
    }

    fetchSellerProfile()
  }, [sellerId])

  const scrollProducts = (direction: "left" | "right") => {
    if (productScrollRef.current) {
      const scrollAmount = 300
      productScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{error || "Không tìm thấy người bán"}</h2>
          <Link href="/">
            <Button>Quay lại trang chủ</Button>
          </Link>
        </div>
      </div>
    )
  }

  const rankInfo = rankConfig[seller.sellerRank] || rankConfig.NEW
  const isOwnProfile = session?.user?.id === seller.id

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" />
          Quay lại
        </Link>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={seller.avatar || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {seller.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{seller.name}</h1>
                  <Badge className={cn("border-0", rankInfo.bg, rankInfo.color)}>
                    {rankInfo.label}
                  </Badge>
                  {seller.sellerStatus === "APPROVED" && (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Đã xác thực
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Tham gia: {formatDate(seller.createdAt)}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-bold">
                      {seller.sellerStats?.avgRating 
                        ? Number(seller.sellerStats.avgRating).toFixed(1)
                        : "0.0"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {seller.sellerStats?.totalReviews || 0} đánh giá
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {seller.sellerStats?.totalTransactions || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Giao dịch</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {seller.sellerStats?.successRate || "0%"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Thành công</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Carousel */}
        {products.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Sản phẩm đang bán ({products.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => scrollProducts("left")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => scrollProducts("right")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div
                ref={productScrollRef}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="shrink-0 w-56 group"
                  >
                    <div className="bg-muted rounded-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
                      <div className="aspect-square bg-muted relative">
                        {product.images[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 left-2 bg-white/90 text-foreground text-xs">
                          {conditionLabels[product.condition] || product.condition}
                        </Badge>
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm line-clamp-2 mb-2 h-10">
                          {product.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-primary">
                            {Number(product.price).toLocaleString("vi-VN")}đ
                          </p>
                          {product._count.reviews > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {product._count.reviews}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Đánh giá ({reviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={review.reviewer.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {review.reviewer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-medium">{review.reviewer.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-3 w-3",
                                    i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <Link 
                          href={`/products/${review.product.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Đánh giá cho: {review.product.title}
                        </Link>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có đánh giá nào</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
