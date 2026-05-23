"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  isActive: boolean
  _count: { products: number }
  createdAt: string
}

export default function AdminBrandsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [showInactive, setShowInactive] = React.useState(false)

  // Dialog state
  const [openCreate, setOpenCreate] = React.useState(false)
  const [openEdit, setOpenEdit] = React.useState(false)
  const [openDelete, setOpenDelete] = React.useState(false)
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Form state
  const [name, setName] = React.useState("")
  const [logo, setLogo] = React.useState("")

  React.useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }

    fetchBrands()
  }, [session, status, router])

  const fetchBrands = async () => {
    try {
      const res = await fetch("/api/brands?includeInactive=true")
      const data = await res.json()
      setBrands(data.brands || [])
    } catch (error) {
      console.error("Error fetching brands:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), logo: logo.trim() || null }),
      })

      if (res.ok) {
        setOpenCreate(false)
        setName("")
        setLogo("")
        fetchBrands()
      } else {
        const data = await res.json()
        alert(data.error || "Lỗi khi tạo thương hiệu")
      }
    } catch (error) {
      console.error("Create error:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedBrand || !name.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), logo: logo.trim() || null }),
      })

      if (res.ok) {
        setOpenEdit(false)
        fetchBrands()
      } else {
        const data = await res.json()
        alert(data.error || "Lỗi khi cập nhật")
      }
    } catch (error) {
      console.error("Edit error:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (brand: Brand) => {
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !brand.isActive }),
      })

      if (res.ok) {
        fetchBrands()
      } else {
        const data = await res.json()
        alert(data.error || "Lỗi khi cập nhật")
      }
    } catch (error) {
      console.error("Toggle error:", error)
    }
  }

  const handleDelete = async () => {
    if (!selectedBrand) return
    setSaving(true)
    try {
      const res = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setOpenDelete(false)
        fetchBrands()
      } else {
        const data = await res.json()
        alert(data.error || "Lỗi khi xóa")
      }
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (brand: Brand) => {
    setSelectedBrand(brand)
    setName(brand.name)
    setLogo(brand.logo || "")
    setOpenEdit(true)
  }

  const openDeleteDialog = (brand: Brand) => {
    setSelectedBrand(brand)
    setOpenDelete(true)
  }

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.name.toLowerCase().includes(search.toLowerCase()) ||
      brand.slug.toLowerCase().includes(search.toLowerCase())
    const matchesActive = showInactive ? true : brand.isActive
    return matchesSearch && matchesActive
  })

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb items={[{ label: "Quản lý thương hiệu" }]} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Thương hiệu</h1>
          <p className="text-muted-foreground mt-1">
            Thêm, sửa, xóa thương hiệu điện thoại
          </p>
        </div>
        <Button
          onClick={() => {
            setName("")
            setLogo("")
            setOpenCreate(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm thương hiệu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm thương hiệu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-sm">Hiển thị đã ẩn</span>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg divide-y">
            {filteredBrands.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Không tìm thấy thương hiệu nào
              </div>
            ) : (
              filteredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className={`flex items-center py-4 px-4 hover:bg-muted/50 transition-colors ${
                    !brand.isActive ? "opacity-60" : ""
                  }`}
                >
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden mr-4 flex-shrink-0">
                    {brand.logo ? (
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    ) : (
                      <Smartphone className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{brand.name}</span>
                      {!brand.isActive && (
                        <Badge variant="destructive">Đã ẩn</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      /{brand.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {brand._count.products} sản phẩm
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(brand)}
                      title={brand.isActive ? "Ẩn thương hiệu" : "Hiện thương hiệu"}
                    >
                      {brand.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(brand)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(brand)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thương hiệu mới</DialogTitle>
            <DialogDescription>
              Điền thông tin thương hiệu mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên thương hiệu</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Apple, Samsung, Xiaomi..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL (tùy chọn)</Label>
              <Input
                id="logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Dán URL hình logo. Khuyến nghị kích thước 200x200px
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving ? "Đang lưu..." : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thương hiệu</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin thương hiệu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tên thương hiệu</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-logo">Logo URL</Label>
              <Input
                id="edit-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logo && (
                <div className="mt-2 w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt="Logo preview"
                    width={48}
                    height={48}
                    className="object-contain max-w-full max-h-full"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit} disabled={!name.trim() || saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thương hiệu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa thương hiệu &quot;{selectedBrand?.name}&quot;?
              {selectedBrand && selectedBrand._count.products > 0 && (
                <span className="block mt-2">
                  Thương hiệu này có {selectedBrand._count.products} sản phẩm. Thương hiệu sẽ bị ẩn thay vì xóa hoàn toàn.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Đang xóa..." : selectedBrand && selectedBrand._count.products > 0 ? "Ẩn thương hiệu" : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
