"use client"

import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Star,
  Store,
  Settings,
  BarChart3,
} from "lucide-react"
import { DashboardLayout } from "./dashboard-layout"

const navGroups = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
      { label: "Báo cáo", href: "/seller/report", icon: BarChart3 },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { label: "Sản phẩm", href: "/seller/products", icon: Package },
      { label: "Đơn hàng", href: "/seller/orders", icon: ShoppingBag },
    ],
  },
  {
    label: "Tài khoản",
    items: [
      { label: "Cài đặt", href: "/settings", icon: Settings },
    ],
  },
]

export function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navGroups={navGroups}>
      {children}
    </DashboardLayout>
  )
}
