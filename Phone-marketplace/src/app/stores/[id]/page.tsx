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
  MessageCircle,
  BadgeCheck,
  Grid3X3,
  LayoutGrid,
  Filter,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StoreStats {
  avgRating: number | null
  totalTransactions: number | null
  successRate: string | null
  totalReviews: number | null
}

interface Store {
  id: string
  name: string
  email: string
  avatar: string | null
  phone: string | null
  sellerRank: string
  sellerStatus: string
  createdAt: string
  sellerStats: StoreStats | null
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

interface Brand {
  id: string
  name: string
  slug: string
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

const conditionColors: Record<string, string> = {
  LIKE_NEW: "bg-green-100 text-green-700",
  PERFECT_99: "bg-blue-100 text-blue-700",
  EXCELLENT_98: "bg-cyan-100 text-cyan-700",
  EXCELLENT_97: "bg-teal-100 text-teal-700",
  GOOD: "bg-orange-100 text-orange-700",
}

export default function StoreProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const storeId = params.id as string

  const [store, setStore] = React.useState<Store | null>(null)
  const [products, setProducts] = React.useState<Product[]>([])
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // View mode
  const [viewMode, setViewMode] = React.useState<"carousel" | "grid">("carousel")
  
  // Filters
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all")
  const [selectedCondition, setSelectedCondition] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<string>("newest")
  const [pagination, setPagination] = React.useState({ page: 1, totalPages: 1, total: 0 })
  const [showFilters, setShowFilters] = React.useState(false)

  // Fetch data
  const fetchStoreData = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedBrand !== "all") params.set("brand", selectedBrand)
      if (selectedCondition !== "all") params.set("condition", selectedCondition)
      params.set("sort", sortBy)
      params.set("page", "1")
      params.set("limit", "20")

      const res = await fetch(`/api/stores/${storeId}?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Không tìm thấy cửa hàng")
        return
      }
      const data = await res.json()
      setStore(data.store)
      setProducts(data.products)
      setReviews(data.reviews)
      setBrands(data.filters?.brands || [])
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
    } catch {
      setError("Lỗi khi tải thông tin")
    } finally {
      setLoading(false)
    }
  }, [storeId, selectedBrand, selectedCondition, sortBy])

  React.useEffect(() => {
    fetchStoreData()
  }, [fetchStoreData])

  const loadMore = async () => {
    if (pagination.page >= pagination.totalPages) return
    
    const params = new URLSearchParams()
    if (selectedBrand !== "all") params.set("brand", selectedBrand)
    if (selectedCondition !== "all") params.set("condition", selectedCondition)
    params.set("sort", sortBy)
    params.set("page", String(pagination.page + 1))
    params.set("limit", "20")

    try {
      const res = await fetch(`/api/stores/${storeId}?${params.toString()}`)
      const data = await res.json()
      setProducts((prev) => [...prev, ...data.products])
      setPagination(data.pagination)
    } catch {
      // Handle error silently
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleChat = () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=/stores/${storeId}`)
      return
    }
    router.push(`/messages/new?userId=${storeId}`)
  }

  const hasActiveFilters = selectedBrand !== "all" || selectedCondition !== "all"

  if (loading && !store) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{error || "Không tìm thấy cửa hàng"}</h2>
          <Link href="/">
            <Button>Quay lại trang chủ</Button>
          </Link>
        </div>
      </div>
    )
  }

  const rankInfo = rankConfig[store.sellerRank] || rankConfig.NEW

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" />
          Quay lại
        </Link>

        {/* Banner */}
        <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-6 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-4">
                <Avatar className="w-20 h-20 md:w-28 md:h-28 border-4 border-white shadow-xl">
                  <AvatarImage src={store.avatar || undefined} />
                  <AvatarFallback className="text-3xl md:text-4xl bg-primary/20 text-primary font-bold">
                    {store.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{store.name}</h1>
                    <Badge className={cn("border-0", rankInfo.bg, rankInfo.color)}>
                      {rankInfo.label}
                    </Badge>
                    {store.sellerStatus === "APPROVED" && (
                      <Badge className="bg-green-500 text-white border-0">
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Đã xác thực
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/90">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Tham gia: {formatDate(store.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleChat}
                className="bg-white text-primary hover:bg-white/90 shadow-lg"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat ngay
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span className="text-2xl font-bold text-amber-700">
                  {store.sellerStats?.avgRating 
                    ? Number(store.sellerStats.avgRating).toFixed(1)
                    : "0.0"}
                </span>
              </div>
              <p className="text-xs text-amber-600">Đánh giá</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {store.sellerStats?.totalTransactions || 0}
              </p>
              <p className="text-xs text-blue-600">Giao dịch</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {store.sellerStats?.successRate || "0%"}
              </p>
              <p className="text-xs text-green-600">Thành công</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">
                {store.sellerStats?.totalReviews || 0}
              </p>
              <p className="text-xs text-purple-600">Đánh giá</p>
            </CardContent>
          </Card>
        </div>

        {/* Products Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Sản phẩm đang bán ({pagination.total})
              </CardTitle>
              
              <div className="flex items-center gap-3">
                {/* Mobile Filter Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Lọc
                  {hasActiveFilters && (
                    <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-primary">
                      {selectedBrand !== "all" ? 1 : 0 + (selectedCondition !== "all" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                    <SelectItem value="price_asc">Giá thấp</SelectItem>
                    <SelectItem value="price_desc">Giá cao</SelectItem>
                    <SelectItem value="rating">Đánh giá cao</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="hidden md:flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("carousel")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "carousel" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="pt-4 border-t mt-4 md:hidden">
                <div className="flex flex-wrap gap-3">
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Hãng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả hãng</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tình trạng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="LIKE_NEW">Như mới</SelectItem>
                      <SelectItem value="PERFECT_99">99%</SelectItem>
                      <SelectItem value="EXCELLENT_98">98%</SelectItem>
                      <SelectItem value="EXCELLENT_97">97%</SelectItem>
                      <SelectItem value="GOOD">Dưới 97%</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBrand("all")
                        setSelectedCondition("all")
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Xóa lọc
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Desktop Filters */}
                <div className="hidden md:flex items-center gap-3 mb-4 pb-4 border-b">
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Hãng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả hãng</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tình trạng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="LIKE_NEW">Như mới</SelectItem>
                      <SelectItem value="PERFECT_99">99%</SelectItem>
                      <SelectItem value="EXCELLENT_98">98%</SelectItem>
                      <SelectItem value="EXCELLENT_97">97%</SelectItem>
                      <SelectItem value="GOOD">Dưới 97%</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBrand("all")
                        setSelectedCondition("all")
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Xóa lọc
                    </Button>
                  )}
                </div>

                {/* Products Grid */}
                <div className={cn(
                  "gap-4",
                  viewMode === "grid" 
                    ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5"
                    : "flex overflow-x-auto pb-2 scrollbar-hide"
                )}>
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className={cn(
                        "group shrink-0",
                        viewMode === "grid" ? "w-full" : "w-56"
                      )}
                    >
                      <div className="bg-muted rounded-xl overflow-hidden transition-all group-hover:shadow-lg group-hover:scale-[1.02]">
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
                          <Badge className={cn(
                            "absolute top-2 left-2 text-xs",
                            conditionColors[product.condition] || "bg-gray-100 text-gray-700"
                          )}>
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

                {/* Load More */}
                {pagination.page < pagination.totalPages && (
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={loadMore}>
                      Xem thêm sản phẩm
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Không có sản phẩm nào</p>
                <p className="text-sm">Cửa hàng chưa có sản phẩm nào đang bán</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Đánh giá từ khách hàng ({reviews.length})
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
                          Sản phẩm: {review.product.title}
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
