"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AddressForm, { AddressFormData } from "@/components/shared/address-form"

interface Address {
  id: string
  fullName: string
  phone: string
  street: string
  provinceCode: string
  provinceName: string
  wardCode: string
  wardName: string
  district: string
  city: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export default function AddressesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [addresses, setAddresses] = React.useState<Address[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [editingAddress, setEditingAddress] = React.useState<Address | null>(null)
  const [deletingAddress, setDeletingAddress] = React.useState<Address | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/addresses")
      return
    }
    if (status === "authenticated") {
      fetchAddresses()
    }
  }, [status, router])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/addresses")
      if (res.ok) {
        const data = await res.json()
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error("Error fetching addresses:", error)
      showMessage("error", "Không thể tải danh sách địa chỉ")
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSubmit = async (data: AddressFormData) => {
    try {
      setSubmitting(true)
      const isEditing = !!editingAddress

      const res = await fetch(
        isEditing ? `/api/addresses/${editingAddress.id}` : "/api/addresses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )

      if (res.ok) {
        const result = await res.json()
        showMessage("success", isEditing ? "Cập nhật địa chỉ thành công!" : "Thêm địa chỉ thành công!")
        setShowAddForm(false)
        setEditingAddress(null)
        fetchAddresses()
      } else {
        const error = await res.json()
        showMessage("error", error.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Error submitting address:", error)
      showMessage("error", "Có lỗi xảy ra, vui lòng thử lại")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetDefault = async (address: Address) => {
    try {
      const res = await fetch(`/api/addresses/${address.id}/default`, {
        method: "POST",
      })
      if (res.ok) {
        showMessage("success", "Đã đặt làm địa chỉ mặc định")
        fetchAddresses()
      } else {
        showMessage("error", "Không thể đặt địa chỉ mặc định")
      }
    } catch (error) {
      console.error("Error setting default address:", error)
      showMessage("error", "Có lỗi xảy ra")
    }
  }

  const handleDelete = async () => {
    if (!deletingAddress) return
    try {
      setSubmitting(true)
      const res = await fetch(`/api/addresses/${deletingAddress.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        showMessage("success", "Xóa địa chỉ thành công")
        fetchAddresses()
      } else {
        showMessage("error", "Không thể xóa địa chỉ")
      }
    } catch (error) {
      console.error("Error deleting address:", error)
      showMessage("error", "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
      setDeletingAddress(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Breadcrumb items={[{ label: "Địa chỉ giao hàng" }]} />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Địa chỉ giao hàng</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý danh sách địa chỉ nhận hàng của bạn
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm địa chỉ
          </Button>
        </div>

        {/* Message */}
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

        {/* Empty state */}
        {addresses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có địa chỉ nào</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Thêm địa chỉ giao hàng để mua sắm thuận tiện hơn
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm địa chỉ đầu tiên
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card
                key={address.id}
                className={address.isDefault ? "border-primary" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{address.fullName}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{address.phone}</span>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            <Check className="h-3 w-3" />
                            Mặc định
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-1">
                          {address.street}
                        </p>
                        <p>
                          {address.wardName}
                          {address.wardName && (address.provinceName || address.city) && ", "}
                          {address.provinceName || address.city}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!address.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(address)}
                          title="Đặt làm mặc định"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingAddress(address)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          {!address.isDefault && (
                            <DropdownMenuItem onClick={() => handleSetDefault(address)}>
                              <Star className="h-4 w-4 mr-2" />
                              Đặt làm mặc định
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeletingAddress(address)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add more button */}
            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm địa chỉ mới
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddForm || !!editingAddress}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingAddress(null)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin địa chỉ giao hàng của bạn
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            initialData={editingAddress || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowAddForm(false)
              setEditingAddress(null)
            }}
            isLoading={submitting}
            submitLabel={editingAddress ? "Lưu thay đổi" : "Thêm địa chỉ"}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingAddress}
        onOpenChange={(open) => !open && setDeletingAddress(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa địa chỉ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa địa chỉ này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
