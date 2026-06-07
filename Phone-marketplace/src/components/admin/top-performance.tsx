"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Trophy,
  Star,
  Smartphone,
  Tag,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TopSeller {
  id: string
  name: string
  email: string
  avatar?: string
  ordersCount: number
  revenue: number
  rating: number
  href?: string
}

interface TopProduct {
  id: string
  title: string
  image?: string
  slug: string
  ordersCount: number
  revenue: number
  href?: string
}

interface TopBrand {
  id: string
  name: string
  revenue: number
  productsCount: number
}

interface TopPerformanceProps {
  sellers?: TopSeller[]
  products?: TopProduct[]
  brands?: TopBrand[]
  maxItems?: number
  className?: string
}

function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  return value.toLocaleString("vi-VN")
}

// Top Sellers List Component
function TopSellersList({
  sellers,
  maxItems = 5,
}: {
  sellers: TopSeller[]
  maxItems?: number
}) {
  if (sellers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sellers.slice(0, maxItems).map((seller, index) => {
        const rankColors = [
          "bg-yellow-500 text-white",
          "bg-gray-400 text-white",
          "bg-amber-600 text-white",
        ]
        const rankBg = rankColors[index] || "bg-gray-200 text-gray-600"

        return (
          <Link
            key={seller.id}
            href={seller.href || `/admin/sellers/${seller.id}`}
            className="block"
          >
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
              {/* Rank */}
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  rankBg
                )}
              >
                {index + 1}
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8 border shrink-0">
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback className="bg-orange-100 text-orange-700 text-sm font-semibold">
                    {seller.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{seller.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{seller.ordersCount} đơn</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(seller.revenue)}₫
                  </span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 text-xs shrink-0">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{Number(seller.rating).toFixed(1)}</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// Top Products List Component
function TopProductsList({
  products,
  maxItems = 5,
}: {
  products: TopProduct[]
  maxItems?: number
}) {
  if (products.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {products.slice(0, maxItems).map((product, index) => {
        const rankColors = [
          "bg-yellow-500 text-white",
          "bg-gray-400 text-white",
          "bg-amber-600 text-white",
        ]
        const rankBg = rankColors[index] || "bg-gray-200 text-gray-600"

        return (
          <Link
            key={product.id}
            href={product.href || `/products/${product.slug}`}
            target="_blank"
            className="block"
          >
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
              {/* Rank */}
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  rankBg
                )}
              >
                {index + 1}
              </div>

              {/* Image */}
              <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{product.ordersCount} đơn</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(product.revenue)}₫
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// Top Brands List Component
function TopBrandsList({
  brands,
  maxItems = 5,
}: {
  brands: TopBrand[]
  maxItems?: number
}) {
  if (brands.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {brands.slice(0, maxItems).map((brand, index) => {
        const rankColors = [
          "bg-yellow-500 text-white",
          "bg-gray-400 text-white",
          "bg-amber-600 text-white",
        ]
        const rankBg = rankColors[index] || "bg-gray-200 text-gray-600"

        return (
          <div
            key={brand.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* Rank */}
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                rankBg
              )}
            >
              {index + 1}
            </div>

            {/* Icon */}
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="h-4 w-4 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{brand.name}</p>
              <p className="text-xs text-muted-foreground">
                {brand.productsCount} sản phẩm
              </p>
            </div>

            {/* Revenue */}
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(brand.revenue)}₫
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TopPerformance({
  sellers = [],
  products = [],
  brands = [],
  maxItems = 5,
  className,
}: TopPerformanceProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Top Performance</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Sellers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🏆</span>
                Top Sellers
              </span>
              <Link href="/admin/sellers">
                <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Xem tất cả
                  <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopSellersList sellers={sellers} maxItems={maxItems} />
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📱</span>
                Top Products
              </span>
              <Link href="/admin/products">
                <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Xem tất cả
                  <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopProductsList products={products} maxItems={maxItems} />
          </CardContent>
        </Card>

        {/* Top Brands */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🏷️</span>
                Top Brands
              </span>
              <Link href="/admin/brands">
                <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Xem tất cả
                  <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopBrandsList brands={brands} maxItems={maxItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Demo data generators
export function generateDemoSellers(): TopSeller[] {
  return [
    {
      id: "1",
      name: "Shop Minh Phone",
      email: "minhphone@example.com",
      ordersCount: 156,
      revenue: 45200000,
      rating: 4.8,
      href: "/admin/sellers/1",
    },
    {
      id: "2",
      name: "Phone G3 Store",
      email: "phoneg3@example.com",
      ordersCount: 134,
      revenue: 38100000,
      rating: 4.7,
      href: "/admin/sellers/2",
    },
    {
      id: "3",
      name: "Cellphone S",
      email: "cellphones@example.com",
      ordersCount: 112,
      revenue: 32500000,
      rating: 4.6,
      href: "/admin/sellers/3",
    },
    {
      id: "4",
      name: "TechZone Store",
      email: "techzone@example.com",
      ordersCount: 98,
      revenue: 28900000,
      rating: 4.5,
      href: "/admin/sellers/4",
    },
    {
      id: "5",
      name: "Smart Buy",
      email: "smartbuy@example.com",
      ordersCount: 87,
      revenue: 24500000,
      rating: 4.4,
      href: "/admin/sellers/5",
    },
  ]
}

export function generateDemoProducts(): TopProduct[] {
  return [
    {
      id: "1",
      title: "iPhone 15 Pro Max 256GB",
      slug: "iphone-15-pro-max-256gb",
      ordersCount: 89,
      revenue: 127000000,
      href: "/products/iphone-15-pro-max-256gb",
    },
    {
      id: "2",
      title: "Samsung Galaxy S24 Ultra",
      slug: "samsung-galaxy-s24-ultra",
      ordersCount: 67,
      revenue: 89000000,
      href: "/products/samsung-galaxy-s24-ultra",
    },
    {
      id: "3",
      title: "Xiaomi 14 Pro",
      slug: "xiaomi-14-pro",
      ordersCount: 54,
      revenue: 67000000,
      href: "/products/xiaomi-14-pro",
    },
    {
      id: "4",
      title: "iPhone 14 128GB",
      slug: "iphone-14-128gb",
      ordersCount: 48,
      revenue: 58000000,
      href: "/products/iphone-14-128gb",
    },
    {
      id: "5",
      title: "Samsung Galaxy Z Fold 5",
      slug: "samsung-galaxy-z-fold-5",
      ordersCount: 32,
      revenue: 48000000,
      href: "/products/samsung-galaxy-z-fold-5",
    },
  ]
}

export function generateDemoBrands(): TopBrand[] {
  return [
    { id: "1", name: "Apple", revenue: 2100000000, productsCount: 45 },
    { id: "2", name: "Samsung", revenue: 1800000000, productsCount: 62 },
    { id: "3", name: "Xiaomi", revenue: 890000000, productsCount: 38 },
    { id: "4", name: "OPPO", revenue: 450000000, productsCount: 28 },
    { id: "5", name: "Vivo", revenue: 320000000, productsCount: 22 },
  ]
}
