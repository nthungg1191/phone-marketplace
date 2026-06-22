"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Smartphone,
  Star,
  Package,
  ChevronRight,
  ArrowLeft,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  title: string
  slug: string
  price: string
  condition: string
  ramGb: number
  storageGb: number
  batteryHealth: number
  images: Array<{ url: string }>
  brand: { name: string }
  seller: {
    name: string
    sellerRank: string
    sellerStats: { avgRating: string } | null
  }
}

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  models: Array<{ id: string; name: string }>
  _count: { products: number }
}

const brandGradients: Record<string, string> = {
  apple: "from-zinc-800 to-zinc-950",
  samsung: "from-blue-500 to-blue-700",
  xiaomi: "from-orange-400 to-orange-600",
  oppo: "from-emerald-500 to-emerald-700",
  vivo: "from-sky-400 to-sky-600",
  realme: "from-yellow-400 to-amber-500",
  huawei: "from-red-500 to-red-700",
  asus: "from-blue-700 to-indigo-800",
  sony: "from-gray-800 to-gray-950",
}

function getBrandGradient(name: string): string {
  const lowerName = name.toLowerCase()
  for (const [key, color] of Object.entries(brandGradients)) {
    if (lowerName.includes(key)) return color
  }
  return "from-primary/80 to-primary"
}

type SortOption = "newest" | "price-asc" | "price-desc" | "rating"
type ConditionFilter = "all" | "LIKE_NEW" | "GOOD" | "FAIR"

const conditionLabels: Record<string, string> = {
  LIKE_NEW: "Như mới",
  GOOD: "Tốt",
  FAIR: "Khá",
}

export default function BrandDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [brand, setBrand] = React.useState<Brand | null>(null)
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [sort, setSort] = React.useState<SortOption>("newest")
  const [condition, setCondition] = React.useState<ConditionFilter>("all")

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const brandsRes = await fetch("/api/brands")
        if (!brandsRes.ok) throw new Error("Lỗi khi tải thương hiệu")
        const brandsData = await brandsRes.json()
        const foundBrand: Brand | undefined = brandsData.brands?.find(
          (b: Brand) => b.slug === slug || b.name.toLowerCase() === slug.toLowerCase()
        )

        if (!foundBrand) {
          setError("Không tìm thấy thương hiệu")
          setLoading(false)
          return
        }

        setBrand(foundBrand)

        const productsRes = await fetch(`/api/products?brandId=${foundBrand.id}`)
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData.products || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  const filteredProducts = React.useMemo(() => {
    let result = [...products]

    if (condition !== "all") {
      result = result.filter((p) => p.condition === condition)
    }

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => Number(a.price) - Number(b.price))
        break
      case "price-desc":
        result.sort((a, b) => Number(b.price) - Number(a.price))
        break
      case "rating":
        result.sort((a, b) => {
          const rA = a.seller.sellerStats ? Number(a.seller.sellerStats.avgRating) : 0
          const rB = b.seller.sellerStats ? Number(b.seller.sellerStats.avgRating) : 0
          return rB - rA
        })
        break
      case "newest":
      default:
        break
    }

    return result
  }, [products, sort, condition])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            {/* Breadcrumb skeleton */}
            <div className="flex gap-2">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-4" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
            {/* Header skeleton */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-muted rounded-2xl" />
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded w-48" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            </div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-border/60 overflow-hidden">
                  <div className="aspect-square bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-5 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{error || "Không tìm thấy thương hiệu"}</h2>
          <p className="text-muted-foreground mb-6">
            Thương hiệu này có thể đã bị xóa hoặc không tồn tại.
          </p>
          <Link href="/brands">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại thương hiệu
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/brands" className="hover:text-foreground transition-colors">
            Thương hiệu
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{brand.name}</span>
        </nav>
      </div>

      {/* Brand Header */}
      <section className="relative overflow-hidden border-b">
        <div className={`absolute inset-0 bg-gradient-to-br ${getBrandGradient(brand.name)} opacity-[0.06]`} />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-10 relative">
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getBrandGradient(brand.name)} flex items-center justify-center shadow-lg flex-shrink-0`}>
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="w-12 h-12 object-contain brightness-0 invert"
                />
              ) : (
                <Smartphone className="h-10 w-10 text-white/80" />
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{brand.name}</h1>
              <p className="text-muted-foreground mt-1.5">
                {brand._count.products} sản phẩm đang bán
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Sort Bar */}
      {products.length > 0 && (
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1.5">
                {[
                  { value: "all" as const, label: "Tất cả" },
                  { value: "LIKE_NEW" as const, label: "Như mới" },
                  { value: "GOOD" as const, label: "Tốt" },
                  { value: "FAIR" as const, label: "Khá" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCondition(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      condition === opt.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted/60 text-foreground border-0 outline-none cursor-pointer hover:bg-muted transition-colors"
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá thấp → cao</option>
                <option value="price-desc">Giá cao → thấp</option>
                <option value="rating">Đánh giá cao</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="container mx-auto px-4 py-4 pb-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {products.length === 0 ? "Chưa có sản phẩm nào" : "Không có sản phẩm phù hợp"}
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              {products.length === 0
                ? "Thương hiệu này hiện chưa có sản phẩm."
                : "Thử thay đổi bộ lọc để xem thêm sản phẩm."}
            </p>
            <Link href={products.length === 0 ? "/products" : "#"}>
              <Button
                variant="outline"
                className="gap-2"
                onClick={products.length > 0 ? () => { setCondition("all"); setSort("newest") } : undefined}
              >
                {products.length === 0 ? "Khám phá sản phẩm khác" : "Xoá bộ lọc"}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredProducts.length} sản phẩm
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const primaryImage = product.images[0]
                return (
                  <Link
                    key={product.id}
                    href={"/products/" + product.slug}
                    className="group bg-white rounded-2xl border border-border/60 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="aspect-square bg-muted/40 relative overflow-hidden">
                      {primaryImage ? (
                        <img
                          src={primaryImage.url}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Smartphone className="h-14 w-14 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Condition badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center px-2.5 py-1 bg-white/90 backdrop-blur-sm text-foreground text-xs font-medium rounded-lg shadow-sm">
                          {conditionLabels[product.condition] || product.condition.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-200 leading-snug">
                        {product.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {product.ramGb}GB / {product.storageGb}GB · Pin {product.batteryHealth}%
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-primary tabular-nums">
                          {Number(product.price).toLocaleString("vi-VN")}đ
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>
                            {product.seller.sellerStats?.avgRating
                              ? Number(product.seller.sellerStats.avgRating).toFixed(1)
                              : "Mới"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}