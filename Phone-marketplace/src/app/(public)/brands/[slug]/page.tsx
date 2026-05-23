"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Smartphone, Star, Package } from "lucide-react"
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

export default function BrandDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [brand, setBrand] = React.useState<Brand | null>(null)
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border overflow-hidden">
                  <div className="aspect-square bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
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
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{error || "Không tìm thấy thương hiệu"}</h2>
          <Link href="/brands">
            <Button>Quay lại thương hiệu</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center overflow-hidden">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
              ) : (
                <Smartphone className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{brand.name}</h1>
              <p className="text-muted-foreground mt-1">
                {brand._count.products} sản phẩm
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Chưa có sản phẩm nào</h2>
            <p className="text-muted-foreground mb-6">Thương hiệu này chưa có sản phẩm nào</p>
            <Link href="/products">
              <Button>Khám phá sản phẩm khác</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const primaryImage = product.images[0]
              return (
                <Link
                  key={product.id}
                  href={"/products/" + product.slug}
                  className="group bg-white border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
                >
                  <div className="aspect-square bg-muted/50 relative overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={primaryImage.url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Smartphone className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      {product.condition.replace("_", " ")}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.ramGb}GB / {product.storageGb}GB · Pin {product.batteryHealth}%
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {Number(product.price).toLocaleString("vi-VN")}đ
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
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
        )}
      </div>
    </div>
  )
}
