"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import {
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Smartphone,
  User,
  Calendar,
  Eye as EyeIcon,
  Check,
} from "lucide-react"

interface Product {
  id: string
  title: string
  slug: string
  price: string
  status: string
  viewCount: number
  createdAt: string
  brand: { name: string }
  model: { name: string }
  images: { url: string }[]
  seller: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-800" },
  ACTIVE: { label: "Hoạt động", color: "bg-green-100 text-green-800" },
  SOLD: { label: "Đã bán", color: "bg-blue-100 text-blue-800" },
  HIDDEN: { label: "Đã ẩn", color: "bg-gray-100 text-gray-800" },
  REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-800" },
}

export default function AdminProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [products, setProducts] = React.useState<Product[]>([])
  const [pagination, setPagination] = React.useState<Pagination | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [sellerIdFilter, setSellerIdFilter] = React.useState<string | null>(null)

  // Sync sellerId from URL params (set when navigating from admin/users)
  React.useEffect(() => {
    if (!searchParams) return
    const sid = searchParams.get("sellerId")
    setSellerIdFilter(sid)
  }, [searchParams])

  // Moderate dialog
  const [showModerateDialog, setShowModerateDialog] = React.useState(false)
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [moderateAction, setModerateAction] = React.useState<"APPROVE" | "REJECT" | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Auth check
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/products")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  // Fetch products
  const fetchProducts = React.useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("page", currentPage.toString())
      const sid = searchParams?.get("sellerId")
      if (sid) params.set("sellerId", sid)

      const res = await fetch(`/api/admin/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setPagination(data.pagination || null)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, currentPage, searchParams, status, session])

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchProducts()
    }
  }, [fetchProducts, status, session])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleOpenModerate = (product: Product, action: "APPROVE" | "REJECT") => {
    setSelectedProduct(product)
    setModerateAction(action)
    setRejectReason("")
    setShowModerateDialog(true)
  }

  const handleModerate = async () => {
    if (!selectedProduct || !moderateAction) return

    if (moderateAction === "REJECT" && !rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/products/${selectedProduct.id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: moderateAction,
          reason: rejectReason,
        }),
      })

      if (res.ok) {
        setShowModerateDialog(false)
        fetchProducts()
      } else {
        const data = await res.json()
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error moderating product:", error)
      alert("Có lỗi xảy ra")
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = React.useMemo(() => {
    return products.filter((p) => p.status === "PENDING").length
  }, [products])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Quản lý sản phẩm" }]} />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Duyệt và quản lý sản phẩm của người bán
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ duyệt ({pendingCount})</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="SOLD">Đã bán</option>
              <option value="HIDDEN">Đã ẩn</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </div>

        {/* Pending Alert */}
        {statusFilter === "ALL" && pendingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800 font-medium">
                Có {pendingCount} sản phẩm đang chờ duyệt
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("PENDING")}
            >
              Xem ngay
            </Button>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Người bán</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Giá</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Không có sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {product.images[0] ? (
                              <img
                                src={product.images[0].url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Smartphone className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{product.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.brand.name} {product.model.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            {product.seller.avatar ? (
                              <img
                                src={product.seller.avatar}
                                alt={product.seller.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{product.seller.name}</p>
                            <p className="text-xs text-muted-foreground">{product.seller.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {parseInt(product.price).toLocaleString("vi-VN")}đ
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full w-fit ${
                              statusLabels[product.status]?.color || "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {statusLabels[product.status]?.label || product.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(product.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Actions for Pending */}
                          {product.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleOpenModerate(product, "APPROVE")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleOpenModerate(product, "REJECT")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Từ chối
                              </Button>
                            </>
                          )}

                          {/* Dropdown for other actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/products/${product.slug}`} target="_blank">
                                  <EyeIcon className="h-4 w-4 mr-2" />
                                  Xem chi tiết
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/seller/products/${product.id}/edit`}>
                                  <EyeIcon className="h-4 w-4 mr-2" />
                                  Chỉnh sửa
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Trang {pagination.page} / {pagination.totalPages} ({pagination.total} sản phẩm)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Moderate Dialog */}
      <Dialog open={showModerateDialog} onOpenChange={setShowModerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderateAction === "APPROVE" ? "Duyệt sản phẩm" : "Từ chối sản phẩm"}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 bg-white rounded overflow-hidden">
                  {selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedProduct.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {parseInt(selectedProduct.price).toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </div>

              {moderateAction === "REJECT" && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Lý do từ chối</Label>
                  <Textarea
                    id="reason"
                    placeholder="Nhập lý do từ chối sản phẩm..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {moderateAction === "APPROVE" && (
                <p className="text-sm text-muted-foreground">
                  Sản phẩm sẽ được hiển thị công khai sau khi duyệt.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModerateDialog(false)}>
              Hủy
            </Button>
            <Button
              variant={moderateAction === "APPROVE" ? "default" : "destructive"}
              onClick={handleModerate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : moderateAction === "APPROVE" ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {moderateAction === "APPROVE" ? "Duyệt" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
