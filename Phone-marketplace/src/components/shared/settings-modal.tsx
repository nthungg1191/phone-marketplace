"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import {
  User,
  Bell,
  Shield,
  Eye,
  Mail,
  MessageCircle,
  Package,
  Save,
  Smartphone,
  Check,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TabType = "account" | "notifications" | "privacy"

const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: "account", label: "Tài khoản", icon: <User className="h-4 w-4" /> },
  { id: "notifications", label: "Thông báo", icon: <Bell className="h-4 w-4" /> },
  { id: "privacy", label: "Quyền riêng tư", icon: <Shield className="h-4 w-4" /> },
]

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? "bg-primary" : "bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { data: session, update } = useSession()

  const [activeTab, setActiveTab] = React.useState<TabType>("account")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [phoneError, setPhoneError] = React.useState("")
  const [avatar, setAvatar] = React.useState("")
  const [avatarUploading, setAvatarUploading] = React.useState(false)

  const [notifSettings, setNotifSettings] = React.useState({
    emailNotifications: true,
    orderNotifications: true,
    marketingEmails: false,
    messageNotifications: true,
    pushNotifications: true,
  })

  const [privacySettings, setPrivacySettings] = React.useState({
    showProfile: true,
    showPhone: false,
    showEmail: false,
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const validatePhone = (value: string): boolean => {
    if (!value) return true
    const phoneRegex = /^0[0-9]{9}$/
    return phoneRegex.test(value)
  }

  React.useEffect(() => {
    if (open && session?.user) {
      fetchSettings()
    }
  }, [open, session])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        const user = data.user
        setName(user.name || "")
        setPhone(user.phone || "")
        setAvatar(user.avatar || "")
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const filtered = value.replace(/[^0-9]/g, "").slice(0, 10)
    setPhone(filtered)
    if (filtered && !validatePhone(filtered)) {
      setPhoneError("Số điện thoại phải là 10 số và bắt đầu bằng số 0")
    } else {
      setPhoneError("")
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Kích thước ảnh không được vượt quá 2MB" })
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAvatar(data.url)
        setMessage({ type: "success", text: "Tải ảnh lên thành công!" })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Lỗi khi tải ảnh" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi khi tải ảnh, vui lòng thử lại" })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!validatePhone(phone)) {
      setPhoneError("Số điện thoại phải là 10 số và bắt đầu bằng số 0")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, avatar }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Cập nhật thành công!" })
        await update({ name, avatar })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Có lỗi xảy ra" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại" })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    setMessage(null)
    try {
      localStorage.setItem("notifSettings", JSON.stringify(notifSettings))
      setMessage({ type: "success", text: "Đã lưu cài đặt thông báo!" })
      setTimeout(() => setMessage(null), 3000)
    } catch {
      setMessage({ type: "error", text: "Lỗi khi lưu cài đặt" })
    } finally {
      setLoading(false)
    }
  }

  const handleSavePrivacy = async () => {
    setLoading(true)
    setMessage(null)
    try {
      localStorage.setItem("privacySettings", JSON.stringify(privacySettings))
      setMessage({ type: "success", text: "Đã lưu cài đặt quyền riêng tư!" })
      setTimeout(() => setMessage(null), 3000)
    } catch {
      setMessage({ type: "error", text: "Lỗi khi lưu cài đặt" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">Cài đặt</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Sidebar */}
          <div className="md:w-44 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {message && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message.type === "success" ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="h-4 w-4 text-lg leading-none shrink-0">!</span>
                )}
                {message.text}
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-primary">
                          {session?.user?.name?.charAt(0) || "?"}
                        </span>
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? "Đang tải..." : "Đổi ảnh"}
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-name" className="text-sm">Họ tên</Label>
                      <Input
                        id="modal-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="modal-phone" className="text-sm">Số điện thoại</Label>
                      <Input
                        id="modal-phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="0912345678"
                        maxLength={10}
                        className="h-9"
                      />
                      {phoneError && (
                        <p className="text-xs text-red-500">{phoneError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="modal-email" className="text-sm">Email</Label>
                      <Input
                        id="modal-email"
                        type="email"
                        value={session?.user?.email || ""}
                        disabled
                        className="h-9 bg-muted"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="modal-role" className="text-sm">Vai trò</Label>
                      <Input
                        id="modal-role"
                        value={
                          session?.user?.role === "ADMIN"
                            ? "Quản trị viên"
                            : session?.user?.role === "SELLER"
                            ? "Người bán"
                            : "Người mua"
                        }
                        disabled
                        className="h-9 bg-muted"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading} size="sm">
                      <Save className="h-4 w-4 mr-1.5" />
                      {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Thông báo qua email</span>
                  </div>
                  <ToggleSwitch
                    checked={notifSettings.emailNotifications}
                    onChange={(checked) =>
                      setNotifSettings((prev) => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Đơn hàng</span>
                  </div>
                  <ToggleSwitch
                    checked={notifSettings.orderNotifications}
                    onChange={(checked) =>
                      setNotifSettings((prev) => ({ ...prev, orderNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tin nhắn</span>
                  </div>
                  <ToggleSwitch
                    checked={notifSettings.messageNotifications}
                    onChange={(checked) =>
                      setNotifSettings((prev) => ({ ...prev, messageNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Push Notification</span>
                  </div>
                  <ToggleSwitch
                    checked={notifSettings.pushNotifications}
                    onChange={(checked) =>
                      setNotifSettings((prev) => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email marketing</span>
                  </div>
                  <ToggleSwitch
                    checked={notifSettings.marketingEmails}
                    onChange={(checked) =>
                      setNotifSettings((prev) => ({ ...prev, marketingEmails: checked }))
                    }
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveNotifications} disabled={loading} size="sm">
                    <Save className="h-4 w-4 mr-1.5" />
                    {loading ? "Đang lưu..." : "Lưu cài đặt"}
                  </Button>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Hiển thị hồ sơ công khai</span>
                  </div>
                  <ToggleSwitch
                    checked={privacySettings.showProfile}
                    onChange={(checked) =>
                      setPrivacySettings((prev) => ({ ...prev, showProfile: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Hiển thị số điện thoại</span>
                  </div>
                  <ToggleSwitch
                    checked={privacySettings.showPhone}
                    onChange={(checked) =>
                      setPrivacySettings((prev) => ({ ...prev, showPhone: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Hiển thị email</span>
                  </div>
                  <ToggleSwitch
                    checked={privacySettings.showEmail}
                    onChange={(checked) =>
                      setPrivacySettings((prev) => ({ ...prev, showEmail: checked }))
                    }
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSavePrivacy} disabled={loading} size="sm">
                    <Save className="h-4 w-4 mr-1.5" />
                    {loading ? "Đang lưu..." : "Lưu cài đặt"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
