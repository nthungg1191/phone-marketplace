"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Activity,
  BarChart3,
  Eye,
  Package,
  TrendingUp,
  Users,
} from "lucide-react"

import { KPICard } from "@/components/analytics/kpi-card"
import { ViewsChart } from "@/components/analytics/views-chart"
import { TopProductsBarChart } from "@/components/analytics/top-products-bar-chart"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type Overview = {
  totalViews: number
  previousViews: number
  uniqueViewers: number
  viewsPerProduct: number
  growthPct: number
}

type TimeseriesPoint = { date: string; views: number; uniqueViewers: number }

type SellerProductStat = {
  productId: string
  title: string
  thumbnail: string | null
  status: "PENDING" | "ACTIVE" | "SOLD" | "HIDDEN" | "REJECTED"
  viewsTotal: number
  viewsToday: number
  viewsLast7d: number
  viewsLast30d: number
}

const statusLabels: Record<SellerProductStat["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Chờ duyệt", variant: "outline" },
  ACTIVE: { label: "Đang bán", variant: "default" },
  SOLD: { label: "Đã bán", variant: "secondary" },
  HIDDEN: { label: "Đã ẩn", variant: "secondary" },
  REJECTED: { label: "Bị từ chối", variant: "destructive" },
}

export default function SellerAnalyticsPage() {
  const router = useRouter()
  const { status } = useSession()
  const searchParams = useSearchParams()

  const [overview, setOverview] = React.useState<Overview | null>(null)
  const [timeseries, setTimeseries] = React.useState<TimeseriesPoint[]>([])
  const [products, setProducts] = React.useState<SellerProductStat[]>([])

  const [loading, setLoading] = React.useState({
    overview: true,
    timeseries: true,
    products: true,
  })

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/analytics")
    }
  }, [status, router])

  const qs = searchParams.toString()
  const qsWithPrefix = qs ? `?${qs}` : ""

  React.useEffect(() => {
    let alive = true

    const fetchJson = async <T,>(url: string): Promise<T | null> => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        return (await res.json()) as T
      } catch {
        return null
      }
    }

    ;(async () => {
      setLoading({ overview: true, timeseries: true, products: true })
      const [ov, ts, pr] = await Promise.all([
        fetchJson<{ overview: Overview }>(`/api/seller/analytics/overview${qsWithPrefix}`),
        fetchJson<{ points: TimeseriesPoint[] }>(`/api/seller/analytics/timeseries${qsWithPrefix}`),
        fetchJson<{ products: SellerProductStat[] }>(`/api/seller/analytics/products${qsWithPrefix}`),
      ])

      if (!alive) return

      if (ov) setOverview(ov.overview)
      if (ts) setTimeseries(ts.points)
      if (pr) setProducts(pr.products)

      setLoading({ overview: false, timeseries: false, products: false })
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs])

  const activeCount = products.filter((p) => p.status === "ACTIVE").length

  // For bar chart: top 5 by views in range (we use viewsLast30d as proxy)
  const top5 = [...products]
    .sort((a, b) => b.viewsLast30d - a.viewsLast30d)
    .slice(0, 5)
    .map((p) => ({
      label: p.title.length > 30 ? p.title.slice(0, 30) + "..." : p.title,
      views: p.viewsLast30d,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics cửa hàng
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Theo dõi lượt xem sản phẩm của bạn theo thời gian
        </p>
      </div>

      <AnalyticsFilters showCategoryFilter={false} showBrandFilter={false} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Tổng lượt xem"
          value={overview ? overview.totalViews.toLocaleString("vi-VN") : "-"}
          icon={<Eye className="h-4 w-4" />}
          changePct={overview?.growthPct}
          changeLabel="so với kỳ trước"
          loading={loading.overview}
        />
        <KPICard
          label="Unique viewers"
          value={overview ? overview.uniqueViewers.toLocaleString("vi-VN") : "-"}
          icon={<Users className="h-4 w-4" />}
          loading={loading.overview}
        />
        <KPICard
          label="Lượt xem / sản phẩm"
          value={overview ? overview.viewsPerProduct.toFixed(1) : "-"}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading.overview}
        />
        <KPICard
          label="Sản phẩm đang bán"
          value={activeCount.toLocaleString("vi-VN")}
          icon={<Package className="h-4 w-4" />}
          loading={loading.products}
        />
      </div>

      {/* Timeseries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xu hướng lượt xem</CardTitle>
        </CardHeader>
        <CardContent>
          <ViewsChart data={timeseries} loading={loading.timeseries} />
        </CardContent>
      </Card>

      {/* Top 5 bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 sản phẩm (30 ngày)</CardTitle>
        </CardHeader>
        <CardContent>
          <TopProductsBarChart data={top5} loading={loading.products} />
        </CardContent>
      </Card>

      {/* Per-product table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Chi tiết từng sản phẩm
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.products ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Bạn chưa có sản phẩm nào.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hôm nay</TableHead>
                  <TableHead className="text-right">7 ngày</TableHead>
                  <TableHead className="text-right">30 ngày</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const st = statusLabels[p.status]
                  return (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.thumbnail}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted" />
                          )}
                          <div className="font-medium line-clamp-2 max-w-xs">
                            {p.title}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.viewsToday.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.viewsLast7d.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.viewsLast30d.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {p.viewsTotal.toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {/* Optional link to product list */}
          <div className="mt-4 text-xs text-muted-foreground">
            <Link href="/seller/products" className="hover:underline">
              Quản lý sản phẩm của bạn →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}