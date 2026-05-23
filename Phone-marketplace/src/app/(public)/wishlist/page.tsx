"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Heart,
  Trash2,
  ShoppingCart,
  Search,
  Star,
  Package,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/shared/breadcrumb"

interface WishlistItem {
  id: string
  product: {
    id: string
    title: string
    slug: string
    price: string
    condition: string
    status: string
    images: Array<{ url: string; isPrimary: boolean }>
    brand: { name: string; slug: string }
    seller: {
      id: string
      name: string
      avatar: string | null
      sellerRank: string
    }
  }
  createdAt: string
}

const conditionLabels: Record<string, string> = {
  LIKE_NEW: "Như mới",
  PERFECT_99: "99% - Mới chưa sử dụng",
  EXCELLENT_98: "98% - Như mới",
  EXCELLENT_97: "97% - Rất đẹp",
  GOOD: "< 97% - Đẹp thường dùng",
}

const conditionColors: Record<string, string> = {
  LIKE_NEW: "bg-green-100 text-green-800",
  PERFECT_99: "bg-emerald-100 text-emerald-800",
  EXCELLENT_98: "bg-teal-100 text-teal-800",
  EXCELLENT_97: "bg-cyan-100 text-cyan-800",
  GOOD: "bg-blue-100 text-blue-800",
}

const rankLabels: Record<string, string> = {
  TOP_SELLER: "Top Seller",
  TRUSTED: "Đáng tin cậy",
  NEW: "Mới",
}

const rankColors: Record<string, string> = {
  TOP_SELLER: "text-yellow-500",
  TRUSTED: "text-blue-500",
  NEW: "text-gray-500",
}

export default function WishlistPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [items, setItems] = React.useState<WishlistItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [addingToCartId, setAddingToCartId] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/wishlist")
      return
    }

    if (status === "authenticated") {
      fetchWishlist()
    }
  }, [status, router])

  const fetchWishlist = async () => {
    try {
      const res = await fetch("/api/wishlist")
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (productId: string) => {
    setRemovingId(productId)
    setMessage(null)
    try {
      const res = await fetch(`/api/wishlist/${productId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.product.id !== productId))
        setMessage({ type: "success", text: "Đã xóa khỏi danh sách yêu thích" })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Lỗi khi xóa" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi khi xóa, vui lòng thử lại" })
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = async (productId: string) => {
    setAddingToCartId(productId)
    setMessage(null)
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "Đã thêm vào giỏ hàng!" })
        setTimeout(() => setMessage(null), 3000)
        // Remove from wishlist after adding to cart
        await fetch(`/api/wishlist/${productId}`, { method: "DELETE" })
        setItems((prev) => prev.filter((item) => item.product.id !== productId))
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Lỗi khi thêm vào giỏ hàng" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi khi thêm vào giỏ hàng, vui lòng thử lại" })
    } finally {
      setAddingToCartId(null)
    }
  }

  const filteredItems = items.filter((item) => {
    const query = search.toLowerCase()
    return (
      item.product.title.toLowerCase().includes(query) ||
      item.product.brand.name.toLowerCase().includes(query)
    )
  })

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
      <Breadcrumb items={[{ label: "Danh sách yêu thích" }]} />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Danh sách yêu thích</h1>
          <Badge variant="secondary">{filteredItems.length} sản phẩm</Badge>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {filteredItems.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm trong danh sách yêu thích..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Heart className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">
                {search ? "Không tìm thấy sản phẩm nào" : "Chưa có sản phẩm yêu thích nào"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {search
                  ? "Thử tìm kiếm với từ khóa khác"
                  : "Hãy thêm những sản phẩm bạn quan tâm vào danh sách yêu thích"}
              </p>
              <Link href="/products">
                <Button>Khám phá sản phẩm</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const product = item.product
              const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0]
              const isOutOfStock = product.status !== "ACTIVE"
              const isRemoving = removingId === product.id
              const isAdding = addingToCartId === product.id

              return (
                <Card
                  key={item.id}
                  className={`group overflow-hidden transition-all ${
                    isOutOfStock ? "opacity-70" : ""
                  }`}
                >
                  <div className="relative">
                    <Link href={`/products/${product.slug}`}>
                      <div className="aspect-square bg-muted overflow-hidden">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {isOutOfStock && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-red-500 text-white">Không còn bán</Badge>
                      </div>
                    )}

                    <button
                      onClick={() => handleRemove(product.id)}
                      disabled={isRemoving}
                      className="absolute top-2 right-2 p-2 bg-background/90 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {isRemoving ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <CardContent className="p-4">
                    <Link href={`/products/${product.slug}`} className="hover:underline">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.title}</h3>
                    </Link>

                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        conditionColors[product.condition] || "bg-gray-100 text-gray-800"
                      }`}>
                        {conditionLabels[product.condition] || product.condition}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">{product.brand.name}</span>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      <Star className={`h-3 w-3 ${rankColors[product.seller.sellerRank] || "text-gray-500"}`} />
                      <span className="text-xs text-muted-foreground">
                        {rankLabels[product.seller.sellerRank] || product.seller.sellerRank}
                      </span>
                      <span className="text-xs text-muted-foreground"> · </span>
                      <Link href={`/stores/${product.seller.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {product.seller.name}
                      </Link>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {Number(product.price).toLocaleString("vi-VN")}đ
                      </span>

                      {!isOutOfStock && (
                        <div className="flex gap-1">
                          <Link href={`/products/${product.slug}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(product.id)}
                            disabled={isAdding}
                          >
                            {isAdding ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
