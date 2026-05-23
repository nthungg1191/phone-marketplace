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
  ChevronRight,
  Loader2,
  Folder,
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

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  parentId: string | null
  _count: { products: number }
  children: Category[]
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  // Dialog state
  const [openCreate, setOpenCreate] = React.useState(false)
  const [openEdit, setOpenEdit] = React.useState(false)
  const [openDelete, setOpenDelete] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Form state
  const [name, setName] = React.useState("")
  const [icon, setIcon] = React.useState("")
  const [parentId, setParentId] = React.useState<string | null>(null)

  // All categories flat for parent selection
  const [allCategories, setAllCategories] = React.useState<Category[]>([])

  React.useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }
    
    fetchCategories()
  }, [session, status, router])

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(data.categories || [])
      // Flatten for parent selection
      const flat: Category[] = []
      const flatten = (cats: Category[]) => {
        cats.forEach((c) => {
          flat.push(c)
          if (c.children?.length) flatten(c.children)
        })
      }
      flatten(data.categories || [])
      setAllCategories(flat)
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon: icon || null, parentId }),
      })

      if (res.ok) {
        setOpenCreate(false)
        setName("")
        setIcon("")
        setParentId(null)
        fetchCategories()
      } else {
        const data = await res.json()
        alert(data.error || "Lỗi khi tạo danh mục")
      }
    } catch (error) {
      console.error("Create error:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedCategory) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon: icon || null, parentId }),
      })

      if (res.ok) {
        setOpenEdit(false)
        fetchCategories()
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

  const handleDelete = async () => {
    if (!selectedCategory) return
    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setOpenDelete(false)
        fetchCategories()
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

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setName(category.name)
    setIcon(category.icon || "")
    setParentId(category.parentId)
    setOpenEdit(true)
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setOpenDelete(true)
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpanded(newExpanded)
  }

  const filterCategories = (cats: Category[], searchTerm: string): Category[] => {
    return cats.filter((cat) => {
      const matches = cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      if (cat.children?.length) {
        const filteredChildren = filterCategories(cat.children, searchTerm)
        if (filteredChildren.length > 0 || matches) {
          return true
        }
      }
      return matches
    })
  }

  const filteredCategories = search ? filterCategories(categories, search) : categories

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children?.length > 0
    const isExpanded = expanded.has(category.id)

    return (
      <React.Fragment key={category.id}>
        <div
          className={`flex items-center py-3 px-4 hover:bg-muted/50 transition-colors ${
            level > 0 ? "ml-" + (level * 6) : ""
          }`}
          style={{ marginLeft: level > 0 ? level * 24 + "px" : 0 }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 mr-2"
              onClick={() => toggleExpand(category.id)}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </Button>
          ) : (
            <div className="w-8" />
          )}
          <div className="flex items-center gap-3 flex-1">
            {category.icon ? (
              <span className="text-xl">{category.icon}</span>
            ) : (
              <Folder className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <span className="font-medium">{category.name}</span>
              <span className="text-muted-foreground text-sm ml-2">({category.slug})</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{category._count?.products || 0} sản phẩm</Badge>
            {hasChildren && (
              <Badge variant="outline">{category.children.length} con</Badge>
            )}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditDialog(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openDeleteDialog(category)}
                disabled={(category._count?.products || 0) > 0}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          category.children.map((child) => renderCategory(child, level + 1))
        )}
      </React.Fragment>
    )
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb items={[{ label: "Quản lý danh mục" }]} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Danh mục</h1>
          <p className="text-muted-foreground mt-1">
            Thêm, sửa, xóa danh mục sản phẩm
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setName("")
              setIcon("")
              setParentId(null)
              setOpenCreate(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Danh mục cha
          </Button>
          <Button
            onClick={() => {
              setName("")
              setIcon("")
              setParentId(null)
              setOpenCreate(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Danh mục con
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg divide-y">
            {filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Không tìm thấy danh mục nào
              </div>
            ) : (
              filteredCategories.map((category) => renderCategory(category))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm danh mục mới</DialogTitle>
            <DialogDescription>
              Điền thông tin danh mục mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên danh mục</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Smartphone, Tablet..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Danh mục cha (tùy chọn)</Label>
              <select
                id="parent"
                value={parentId || ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                <option value="">-- Không có --</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={!name || saving}>
              {saving ? "Đang lưu..." : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa danh mục</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin danh mục
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tên danh mục</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icon">Icon (emoji)</Label>
              <Input
                id="edit-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Danh mục cha</Label>
              <select
                id="edit-parent"
                value={parentId || ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                <option value="">-- Không có --</option>
                {allCategories
                  .filter((cat) => cat.id !== selectedCategory?.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit} disabled={!name || saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa danh mục</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa danh mục &quot;{selectedCategory?.name}&quot;?
              {selectedCategory && selectedCategory.children?.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Danh mục này có {selectedCategory.children.length} danh mục con. 
                  Vui lòng xóa các danh mục con trước.
                </span>
              )}
              {selectedCategory && selectedCategory._count.products > 0 && (
                <span className="block mt-2 text-destructive">
                  Danh mục này có {selectedCategory._count.products} sản phẩm. 
                  Không thể xóa.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!selectedCategory?.children?.length || !!(selectedCategory?._count?.products)}
            >
              {saving ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
