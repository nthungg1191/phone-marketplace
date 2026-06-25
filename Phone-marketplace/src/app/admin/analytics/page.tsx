"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Eye,
  Package,
  TrendingUp,
  Users,
} from "lucide-react"

import { KPICard } from "@/components/analytics/kpi-card"
import { ViewsChart } from "@/components/analytics/views-chart"
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
import { Button } from "@/components/ui/button"
import { formatRelativeTime, formatCurrency } from "@/lib/format"

type Overview = {
  totalViews: number
  previousViews: number
  uniqueViewers: number
  viewsPerProduct: number
  growthPct: number
}

type TimeseriesPoint = { date: string; views: number; uniqueViewers: number }

type TopProductRow = {
  productId: string
  title: string
  slug: string
  thumbnail: string | null
  sellerName: string
  categoryName: string
  brandName: string
  views: number
  uniqueViewers: number
  price: number
}

type RecentViewRow = {
  id: string
  productId: string
  productTitle: string
  productSlug: string
  userName: string | null
  ipAddress: string | null
  createdAt: string
}

type AnomalyRow = {
  productId: string
  title: string
  sellerName: string
  viewsRecent: number
  viewsBaseline: number
  spikeRatio: number
  severity: "low" | "medium" | "high"
}

type Category = { id: string; name: string }
type Brand = { id: string; name: string }

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { status } = useSession()
  const searchParams = useSearchParams()

  const [overview, setOverview] = React.useState<Overview | null>(null)
  const [timeseries, setTimeseries] = React.useState<TimeseriesPoint[]>([])
  const [topProducts, setTopProducts] = React.useState<TopProductRow[]>([])
  const [recentViews, setRecentViews] = React.useState<RecentViewRow[]>([])
  const [anomalies, setAnomalies] = React.useState<AnomalyRow[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [brands, setBrands] = React.useState<Brand[]>([])

  const [loading, setLoading] = React.useState({
    overview: true,
    timeseries: true,
    top: true,
    recent: true,
    anomalies: true,
    filters: true,
  })

  // Auth gate
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin/analytics")
    }
  }, [status, router])

  // Load filter options once
  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/admin/analytics/filters")
        if (res.ok && alive) {
          const data = await res.json()
          setCategories(data.categories ?? [])
          setBrands(data.brands ?? [])
        }
      } catch {
        // silent
      } finally {
        if (alive) setLoading((s) => ({ ...s, filters: false }))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Build query string from URL params (preserves filters across reload)
  const qs = searchParams.toString()
  const qsWithPrefix = qs ? `?${qs}` : ""

  // Load all analytics in parallel when filters change
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
      setLoading({
        overview: true,
        timeseries: true,
        top: true,
        recent: true,
        anomalies: true,
        filters: loading.filters,
      })

      const [ov, ts, tp, rv, an] = await Promise.all([
        fetchJson<{ overview: Overview }>(`/api/admin/analytics/overview${qsWithPrefix}`),
        fetchJson<{ points: TimeseriesPoint[] }>(`/api/admin/analytics/timeseries${qsWithPrefix}`),
        fetchJson<{ products: TopProductRow[] }>(`/api/admin/analytics/top-products${qsWithPrefix}`),
        fetchJson<{ views: RecentViewRow[] }>(`/api/admin/analytics/recent-views${qsWithPrefix}`),
        fetchJson<{ anomalies: AnomalyRow[] }>(`/api/admin/analytics/anomalies`),
      ])

      if (!alive) return

      if (ov) setOverview(ov.overview)
      if (ts) setTimeseries(ts.points)
      if (tp) setTopProducts(tp.products)
      if (rv) setRecentViews(rv.views)
      if (an) setAnomalies(an.anomalies)

      setLoading({
        overview: false,
        timeseries: false,
        top: false,
        recent: false,
        anomalies: false,
        filters: loading.filters,
      })
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thống kê lượt xem sản phẩm toàn hệ thống
          </p>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        categories={categories}
        brands={brands}
        showCategoryFilter
        showBrandFilter
      />

      {/* KPI cards */}
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
          value={
            overview ? overview.viewsPerProduct.toFixed(1) : "-"
          }
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading.overview}
        />
        <KPICard
          label="Sản phẩm bất thường"
          value={anomalies.length.toLocaleString("vi-VN")}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={loading.anomalies}
        />
      </div>

      {/* Timeseries chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xu hướng lượt xem</CardTitle>
        </CardHeader>
        <CardContent>
          <ViewsChart data={timeseries} loading={loading.timeseries} />
        </CardContent>
      </Card>

      {/* Two-column row: top products + anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top sản phẩm được xem nhiều
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.top ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Chưa có dữ liệu trong khoảng thời gian này
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Unique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.slice(0, 8).map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <Link
                          href={`/products/${p.slug}`}
                          className="hover:underline"
                        >
                          <div className="font-medium line-clamp-1">
                            {p.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.brandName} • {p.sellerName} •{" "}
                            {formatCurrency(p.price)}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {p.views.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.uniqueViewers.toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Anomalies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sản phẩm tăng view bất thường
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.anomalies ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : anomalies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Không phát hiện bất thường
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">24h</TableHead>
                    <TableHead>TB/ngày</TableHead>
                    <TableHead>Mức</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.slice(0, 8).map((a) => (
                    <TableRow key={a.productId}>
                      <TableCell>
                        <div className="font-medium line-clamp-1">
                          {a.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.sellerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-600">
                        {a.viewsRecent.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.viewsBaseline.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.severity === "high"
                              ? "destructive"
                              : a.severity === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {a.spikeRatio}x
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent views */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Lượt xem gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.recent ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : recentViews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Chưa có lượt xem nào
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Người xem</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentViews.slice(0, 20).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link
                        href={`/products/${v.productSlug}`}
                        className="hover:underline font-medium"
                      >
                        {v.productTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {v.userName ? (
                        <span>{v.userName}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          Khách
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {v.ipAddress ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(v.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Empty-state helper for sellers-only view: nothing here */}
      {status === "loading" ? (
        <div className="text-center text-muted-foreground">Đang tải...</div>
      ) : null}

      {overview && overview.totalViews === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4">
          Chưa có dữ liệu view trong khoảng thời gian đã chọn.
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push("/admin/products")}
          >
            Xem danh sách sản phẩm
          </Button>
        </div>
      ) : null}
    </div>
  )
}