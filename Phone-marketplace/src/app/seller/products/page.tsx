"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Package,
  Plus,
  Search,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
  Filter,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  title: string
  slug: string
  price: string
  status: string
  images: { url: string; isPrimary: boolean }[]
  brand: { name: string }
  viewCount: number
  createdAt: string
  rejectionReason?: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING: { label: "Chờ duyệt", color: "text-yellow-600", bg: "bg-yellow-50", icon: Clock },
  ACTIVE: { label: "Đang bán", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  SOLD: { label: "Đã bán", color: "text-blue-600", bg: "bg-blue-50", icon: Package },
  HIDDEN: { label: "Đã ẩn", color: "text-gray-600", bg: "bg-gray-50", icon: EyeOff },
  REJECTED: { label: "Bị từ chối", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

const statusFilters = [
  { value: "all", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "SOLD", label: "Đã bán" },
  { value: "HIDDEN", label: "Đã ẩn" },
  { value: "REJECTED", label: "Bị từ chối" },
]

export default function SellerProductsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [filter, setFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalProducts, setTotalProducts] = React.useState(0)

  const [deleteProductId, setDeleteProductId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [showDetailDialog, setShowDetailDialog] = React.useState(false)

  const limit = 12

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/products")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SELLER" && session?.user?.sellerStatus !== "APPROVED") {
        router.push("/seller/register")
        return
      }
    }
  }, [status, session, router])

  React.useEffect(() => {
    if (status === "authenticated") {
      fetchProducts()
    }
  }, [status, page, filter, debouncedSearch])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        myProducts: "true",
      })

      if (debouncedSearch) params.append("search", debouncedSearch)
      if (filter !== "all") params.append("status", filter)

      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalProducts(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
        )
      }
    } catch (error) {
      console.error("Error updating product status:", error)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${deleteProductId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== deleteProductId))
        setTotalProducts((prev) => prev - 1)
        setDeleteProductId(null)
      }
    } catch (error) {
      console.error("Error deleting product:", error)
    } finally {
      setDeleting(false)
    }
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowDetailDialog(true)
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground mt-1">
            {totalProducts} sản phẩm
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Đăng sản phẩm mới
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10 pr-10"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("")
                    setPage(1)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((statusFilter) => (
                <Button
                  key={statusFilter.value}
                  variant={filter === statusFilter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilter(statusFilter.value)
                    setPage(1)
                  }}
                  className="text-xs"
                >
                  {statusFilter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title={search || filter !== "all" ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm nào"}
              description={
                search || filter !== "all"
                  ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                  : "Bắt đầu đăng sản phẩm đầu tiên của bạn"
              }
              action={
                search || filter !== "all" ? (
                  <Button variant="outline" onClick={() => {
                    setSearch("")
                    setFilter("all")
                    setPage(1)
                  }}>
                    Xóa bộ lọc
                  </Button>
                ) : (
                  <Link href="/seller/products/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Đăng sản phẩm mới
                    </Button>
                  </Link>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => {
            const statusInfo = statusConfig[product.status] || statusConfig.PENDING
            const StatusIcon = statusInfo.icon
            const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0]

            return (
              <Card
                key={product.id}
                className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="relative aspect-square bg-muted">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge className={cn("gap-1 border-0 backdrop-blur", statusInfo.bg, statusInfo.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProduct(product)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        {product.status === "ACTIVE" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(product.id, "HIDDEN")}>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Ẩn sản phẩm
                          </DropdownMenuItem>
                        )}
                        {product.status === "HIDDEN" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(product.id, "ACTIVE")}>
                            <Eye className="h-4 w-4 mr-2" />
                            Hiển thị sản phẩm
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/seller/products/${product.slug}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteProductId(product.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa sản phẩm
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardContent className="p-4">
                  <Link href={`/seller/products/${product.slug}/edit`} className="block">
                    <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-3">{product.brand.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">
                      {Number(product.price).toLocaleString("vi-VN")}đ
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {product.viewCount}
                    </div>
                  </div>
                  {product.status === "REJECTED" && product.rejectionReason && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{product.rejectionReason}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === p ? "default" : "outline"}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Xóa sản phẩm?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Sản phẩm sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa sản phẩm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết sản phẩm</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="aspect-square bg-muted rounded-xl overflow-hidden relative">
                  {selectedProduct.images[0] ? (
                    <Image
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tiêu đề</p>
                    <p className="font-semibold">{selectedProduct.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thương hiệu</p>
                    <p className="font-semibold">{selectedProduct.brand.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Giá</p>
                    <p className="font-bold text-primary text-xl">
                      {Number(selectedProduct.price).toLocaleString("vi-VN")}đ
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trạng thái</p>
                    <Badge className={cn("mt-1 border-0", statusConfig[selectedProduct.status]?.bg, statusConfig[selectedProduct.status]?.color)}>
                      {statusConfig[selectedProduct.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lượt xem</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {selectedProduct.viewCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày đăng</p>
                    <p className="font-semibold">
                      {new Date(selectedProduct.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {selectedProduct.status === "REJECTED" && selectedProduct.rejectionReason && (
                <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-1 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Lý do bị từ chối:
                  </p>
                  <p className="text-sm text-destructive/80">{selectedProduct.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDetailDialog(false)}
                >
                  Đóng
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    setShowDetailDialog(false)
                    router.push(`/seller/products/${selectedProduct.slug}/edit`)
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
