"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Shield,
  Users,
  Package,
  ShoppingBag,
  Tag,
  Settings,
  LayoutDashboard,
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
    label: "Quản lý",
    items: [
      { label: "Người dùng", href: "/admin/users", icon: Users },
      { label: "Sản phẩm", href: "/admin/products", icon: Package },
      { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
      { label: "Duyệt Seller", href: "/admin/sellers", icon: Shield },
      { label: "Thương hiệu", href: "/admin/brands", icon: Tag },
      { label: "Danh mục", href: "/admin/categories", icon: Tag },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Cài đặt", href: "/admin/settings", icon: Settings },
    ],
  },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navGroups={navGroups}>
      {children}
    </DashboardLayout>
  )
}
