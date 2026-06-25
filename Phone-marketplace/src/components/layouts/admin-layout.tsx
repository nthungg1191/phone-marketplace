"use client"

import {
  Shield,
  Users,
  Package,
  ShoppingBag,
  Tag,
  Settings,
  LayoutDashboard,
  FileText,
  Activity,
  BarChart3,
} from "lucide-react"
import { DashboardLayout } from "./dashboard-layout"

const navGroups = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Người dùng",
    items: [
      { label: "Người dùng", href: "/admin/users", icon: Users },
      { label: "Duyệt Seller", href: "/admin/sellers", icon: Shield },
    ],
  },
  {
    label: "Kinh doanh",
    items: [
      { label: "Sản phẩm", href: "/admin/products", icon: Package },
      { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
      { label: "Hoàn tiền", href: "/admin/orders?status=RETURN_PENDING", icon: ShoppingBag },
    ],
  },
  {
    label: "Danh mục",
    items: [
      { label: "Danh mục", href: "/admin/categories", icon: Tag },
      { label: "Thương hiệu", href: "/admin/brands", icon: Tag },
    ],
  },
  {
    label: "Báo cáo",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Báo cáo", href: "/admin/reports", icon: FileText },
      { label: "Nhật ký", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Cài đặt", href: "/admin/settings", icon: Settings },
    ],
  },
]

interface AdminLayoutClientProps {
  children: React.ReactNode
  pendingCounts?: {
    sellers?: number
    products?: number
    returns?: number
    complaints?: number
    violations?: number
  }
}

export function AdminLayout({ children, pendingCounts }: AdminLayoutClientProps) {
  return (
    <DashboardLayout navGroups={navGroups} pendingCounts={pendingCounts}>
      {children}
    </DashboardLayout>
  )
}
