"use client"

import * as React from "react"
import Link from "next/link"
import {
  ShoppingBag,
  Eye,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  RotateCcw,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OrderItem {
  id: string
  title: string
  quantity: number
  price: number
  image?: string
}

interface Order {
  id: string
  orderCode: string
  status: OrderStatus
  totalAmount: number
  createdAt: Date | string
  buyer: {
    id: string
    name: string
  }
  seller?: {
    id: string
    name: string
  }
  items?: OrderItem[]
  itemCount?: number
}

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "SHIPPING"
  | "DELIVERED"
  | "RECEIVED"
  | "RETURN_PERIOD"
  | "RETURN_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"

interface RecentOrdersTableProps {
  orders: Order[]
  maxItems?: number
  showViewAll?: boolean
  className?: string
}

const statusConfig: Record<
  OrderStatus,
  {
    label: string
    color: string
    bgColor: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: Clock,
  },
  PAID: {
    label: "Đã thanh toán",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: CheckCircle,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    icon: CheckCircle,
  },
  SHIPPING: {
    label: "Đang giao",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: Truck,
  },
  DELIVERED: {
    label: "Đã giao",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    icon: Package,
  },
  RECEIVED: {
    label: "Đã nhận",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: CheckCircle,
  },
  RETURN_PERIOD: {
    label: "Dùng thử",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
    icon: Clock,
  },
  RETURN_PENDING: {
    label: "Chờ trả hàng",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: RotateCcw,
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: XCircle,
  },
  REFUNDED: {
    label: "Hoàn tiền",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: RotateCcw,
  },
}

function formatCurrency(value: number): string {
  return value.toLocaleString("vi-VN")
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const orderDate = new Date(date)
  const diffMs = now.getTime() - orderDate.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Vừa xong"
  if (diffMins < 60) return `${diffMins} phút`
  if (diffHours < 24) return `${diffHours} giờ`
  if (diffDays < 7) return `${diffDays} ngày`
  return orderDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] || statusConfig.PENDING_PAYMENT
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export function RecentOrdersTable({
  orders,
  maxItems = 8,
  showViewAll = true,
  className,
}: RecentOrdersTableProps) {
  const displayedOrders = orders.slice(0, maxItems)

  if (orders.length === 0) {
    return (
      <Card className={cn("border-0 shadow-sm", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">📦</span>
            Đơn hàng gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Chưa có đơn hàng nào
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            Đơn hàng gần đây
          </span>
          {showViewAll && (
            <Link href="/admin/orders">
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                  Mã đơ
                </th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                  Khách hàng
                </th>
                {orders[0]?.seller && (
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                    Người bán
                  </th>
                )}
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                  Giá trị
                </th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                  Trạng thái
                </th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                  Thời gian
                </th>
                <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                    <td className="py-3 px-2">
                      <span className="font-mono font-semibold text-sm">
                        {order.orderCode}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium line-clamp-1">
                        {order.buyer.name}
                      </p>
                    </td>
                    {order.seller && (
                      <td className="py-3 px-2">
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {order.seller.name}
                        </p>
                      </td>
                    )}
                    <td className="py-3 px-2">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(order.totalAmount)}₫
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(order.createdAt)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2">
          {displayedOrders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`}>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-sm">
                      {order.orderCode}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {order.buyer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(order.totalAmount)}₫
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Demo data generator
export function generateDemoOrders(): Order[] {
  const now = new Date()
  return [
    {
      id: "1",
      orderCode: "ORD-2024-1234",
      status: "CONFIRMED",
      totalAmount: 2500000,
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      buyer: { id: "1", name: "Nguyễn Văn A" },
      seller: { id: "1", name: "Shop Minh Phone" },
      itemCount: 2,
    },
    {
      id: "2",
      orderCode: "ORD-2024-1233",
      status: "SHIPPING",
      totalAmount: 890000,
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
      buyer: { id: "2", name: "Trần Thị B" },
      seller: { id: "2", name: "Phone G3 Store" },
      itemCount: 1,
    },
    {
      id: "3",
      orderCode: "ORD-2024-1232",
      status: "DELIVERED",
      totalAmount: 15800000,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      buyer: { id: "3", name: "Lê Hoàng C" },
      seller: { id: "3", name: "Cellphone S" },
      itemCount: 1,
    },
    {
      id: "4",
      orderCode: "ORD-2024-1231",
      status: "RETURN_PENDING",
      totalAmount: 3200000,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      buyer: { id: "4", name: "Phạm Minh D" },
      seller: { id: "4", name: "TechZone Store" },
      itemCount: 1,
    },
    {
      id: "5",
      orderCode: "ORD-2024-1230",
      status: "COMPLETED",
      totalAmount: 780000,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      buyer: { id: "5", name: "Hoàng Đức E" },
      seller: { id: "5", name: "Smart Buy" },
      itemCount: 3,
    },
    {
      id: "6",
      orderCode: "ORD-2024-1229",
      status: "PENDING_PAYMENT",
      totalAmount: 5600000,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      buyer: { id: "6", name: "Vũ Thị F" },
      seller: { id: "1", name: "Shop Minh Phone" },
      itemCount: 2,
    },
    {
      id: "7",
      orderCode: "ORD-2024-1228",
      status: "PAID",
      totalAmount: 1890000,
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      buyer: { id: "7", name: "Đặng Văn G" },
      seller: { id: "2", name: "Phone G3 Store" },
      itemCount: 1,
    },
    {
      id: "8",
      orderCode: "ORD-2024-1227",
      status: "CANCELLED",
      totalAmount: 990000,
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      buyer: { id: "8", name: "Bùi Thị H" },
      seller: { id: "3", name: "Cellphone S" },
      itemCount: 1,
    },
  ]
}
