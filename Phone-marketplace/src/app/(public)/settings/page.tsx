"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  Globe,
  Lock,
  Check,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Breadcrumb } from "@/components/shared/breadcrumb"

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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? "bg-primary" : "bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()

  const [activeTab, setActiveTab] = React.useState<TabType>("account")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Account tab state
  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [phoneError, setPhoneError] = React.useState("")
  const [avatar, setAvatar] = React.useState("")
  const [avatarUploading, setAvatarUploading] = React.useState(false)

  // Notifications tab state
  const [notifSettings, setNotifSettings] = React.useState({
    emailNotifications: true,
    orderNotifications: true,
    marketingEmails: false,
    messageNotifications: true,
    pushNotifications: true,
  })

  // Privacy tab state
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
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings")
      return
    }

    if (status === "authenticated") {
      fetchSettings()
    }
  }, [status, router])

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
      // Save to local storage for now (can extend to API later)
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

  if (status === "loading") {
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
      <Breadcrumb items={[{ label: "Cài đặt" }]} />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Cài đặt</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {message && (
              <div
                className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message.type === "success" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 text-lg leading-none">!</span>
                )}
                {message.text}
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Thông tin tài khoản
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveAccount} className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                          {avatar ? (
                            <img src={avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-bold text-primary">
                              {session?.user?.name?.charAt(0) || "?"}
                            </span>
                          )}
                          {avatarUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
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
                          {avatarUploading ? "Đang tải..." : "Đổi ảnh đại diện"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG. Tối đa 2MB
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Họ tên</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Số điện thoại</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="0912345678"
                          maxLength={10}
                        />
                        {phoneError && (
                          <p className="text-xs text-red-500">{phoneError}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={session?.user?.email || ""}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email không thể thay đổi
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Vai trò</Label>
                        <Input
                          id="role"
                          value={
                            session?.user?.role === "ADMIN"
                              ? "Quản trị viên"
                              : session?.user?.role === "SELLER"
                              ? "Người bán"
                              : "Người mua"
                          }
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Đang lưu..." : "Lưu thay đổi"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Cài đặt thông báo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Chọn loại thông báo bạn muốn nhận qua email hoặc trong ứng dụng.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Thông báo qua email</p>
                          <p className="text-xs text-muted-foreground">Nhận thông báo qua hộp thư điện tử</p>
                        </div>
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
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Đơn hàng</p>
                          <p className="text-xs text-muted-foreground">Cập nhật trạng thái đơn hàng của bạn</p>
                        </div>
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
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <MessageCircle className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Tin nhắn</p>
                          <p className="text-xs text-muted-foreground">Thông báo khi có tin nhắn mới từ người khác</p>
                        </div>
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
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Smartphone className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Push Notification</p>
                          <p className="text-xs text-muted-foreground">Nhận thông báo đẩy trên thiết bị</p>
                        </div>
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
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Tag className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Email marketing</p>
                          <p className="text-xs text-muted-foreground">Nhận email về khuyến mãi và ưu đãi đặc biệt</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={notifSettings.marketingEmails}
                        onChange={(checked) =>
                          setNotifSettings((prev) => ({ ...prev, marketingEmails: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSaveNotifications} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Đang lưu..." : "Lưu cài đặt"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Quyền riêng tư
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Kiểm soát ai có thể xem thông tin cá nhân của bạn trên HNT.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Hiển thị hồ sơ công khai</p>
                          <p className="text-xs text-muted-foreground">Cho phép người khác xem hồ sơ của bạn</p>
                        </div>
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
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Smartphone className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Hiển thị số điện thoại</p>
                          <p className="text-xs text-muted-foreground">Cho phép người khác xem số điện thoại của bạn</p>
                        </div>
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
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Mail className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Hiển thị email</p>
                          <p className="text-xs text-muted-foreground">Cho phép người khác xem địa chỉ email của bạn</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={privacySettings.showEmail}
                        onChange={(checked) =>
                          setPrivacySettings((prev) => ({ ...prev, showEmail: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSavePrivacy} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Đang lưu..." : "Lưu cài đặt"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
