// ============================================================
// Analytics helpers for ProductView tracking.
// Used by both admin and seller dashboards.
// ============================================================

import { prisma } from "@/lib/prisma"
import type { ProductStatus } from "@prisma/client"

// ============================================================
// Types
// ============================================================

export type DateRange = {
  from: Date
  to: Date
}

export type AnalyticsScope = {
  sellerId?: string
  categoryId?: string
  brandId?: string
}

export type AnalyticsOverview = {
  totalViews: number
  previousViews: number
  uniqueViewers: number
  viewsPerProduct: number
  growthPct: number
}

export type TimeseriesPoint = {
  date: string // ISO date "YYYY-MM-DD"
  views: number
  uniqueViewers: number
}

export type TopProductRow = {
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

export type RecentViewRow = {
  id: string
  productId: string
  productTitle: string
  productSlug: string
  userName: string | null
  ipAddress: string | null
  createdAt: Date
}

export type AnomalyRow = {
  productId: string
  title: string
  sellerName: string
  viewsRecent: number
  viewsBaseline: number
  spikeRatio: number
  severity: "low" | "medium" | "high"
}

export type SellerProductStat = {
  productId: string
  title: string
  thumbnail: string | null
  status: ProductStatus
  viewsTotal: number
  viewsToday: number
  viewsLast7d: number
  viewsLast30d: number
}

// ============================================================
// Internal helpers
// ============================================================

/** Build a Prisma where clause that scopes view queries by product attributes. */
function buildViewWhere(range: DateRange, scope?: AnalyticsScope) {
  const productWhere: Record<string, unknown> = {}
  if (scope?.sellerId) productWhere.sellerId = scope.sellerId
  if (scope?.categoryId) productWhere.categoryId = scope.categoryId
  if (scope?.brandId) productWhere.brandId = scope.brandId

  return {
    createdAt: { gte: range.from, lte: range.to },
    ...(Object.keys(productWhere).length > 0 ? { product: productWhere } : {}),
  }
}

/** Bucket of YYYY-MM-DD -> {views, uniqueIPs}. */
function emptyBuckets(range: DateRange): Map<string, { views: number; ips: Set<string> }> {
  const map = new Map<string, { views: number; ips: Set<string> }>()
  const cursor = new Date(range.from)
  cursor.setUTCHours(0, 0, 0, 0)
  while (cursor <= range.to) {
    const key = cursor.toISOString().slice(0, 10)
    map.set(key, { views: 0, ips: new Set() })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return map
}

/** Count distinct identifiers from view rows that have only ipAddress (no userId). */
function countUniqueFromRows(
  rows: Array<{ userId: string | null; ipAddress: string | null }>
): number {
  const set = new Set<string>()
  for (const r of rows) {
    if (r.userId) set.add(`u:${r.userId}`)
    else if (r.ipAddress) set.add(`i:${r.ipAddress}`)
  }
  return set.size
}

// ============================================================
// Public API
// ============================================================

/**
 * KPI overview for the given range plus a comparison window of equal length
 * immediately preceding it.
 */
export async function getOverview(
  range: DateRange,
  scope?: AnalyticsScope
): Promise<AnalyticsOverview> {
  const span = range.to.getTime() - range.from.getTime()
  const prevRange: DateRange = {
    from: new Date(range.from.getTime() - span - 1),
    to: new Date(range.from.getTime() - 1),
  }

  const where = buildViewWhere(range, scope)
  const prevWhere = buildViewWhere(prevRange, scope)

  const [current, previous, uniqueRows, productCount] = await Promise.all([
    prisma.productView.count({ where }),
    prisma.productView.count({ where: prevWhere }),
    prisma.productView.findMany({
      where,
      select: { userId: true, ipAddress: true },
    }),
    prisma.product.count({
      where: {
        status: "ACTIVE",
        ...(scope?.sellerId ? { sellerId: scope.sellerId } : {}),
        ...(scope?.categoryId ? { categoryId: scope.categoryId } : {}),
        ...(scope?.brandId ? { brandId: scope.brandId } : {}),
      },
    }),
  ])

  const growthPct =
    previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100

  return {
    totalViews: current,
    previousViews: previous,
    uniqueViewers: countUniqueFromRows(uniqueRows),
    viewsPerProduct: productCount === 0 ? 0 : current / productCount,
    growthPct,
  }
}

/** Per-day timeseries for a line chart. */
export async function getTimeseries(
  range: DateRange,
  scope?: AnalyticsScope
): Promise<TimeseriesPoint[]> {
  const buckets = emptyBuckets(range)
  const rows = await prisma.productView.findMany({
    where: buildViewWhere(range, scope),
    select: { createdAt: true, userId: true, ipAddress: true },
  })

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.views += 1
    if (row.userId) bucket.ips.add(`u:${row.userId}`)
    else if (row.ipAddress) bucket.ips.add(`i:${row.ipAddress}`)
  }

  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    views: b.views,
    uniqueViewers: b.ips.size,
  }))
}

/** Top products by total views within the range. */
export async function getTopProducts(
  range: DateRange,
  scope?: AnalyticsScope,
  limit = 10
): Promise<TopProductRow[]> {
  const where = buildViewWhere(range, scope)

  const grouped = await prisma.productView.groupBy({
    by: ["productId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  })

  if (grouped.length === 0) return []

  const ids = grouped.map((g) => g.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      seller: { select: { name: true } },
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  // For unique viewers per product, do a single group-by
  // (cheap because we only have `limit` products).
  const uniqueRows = await prisma.productView.findMany({
    where: { ...where, productId: { in: ids } },
    select: { productId: true, userId: true, ipAddress: true },
  })
  const uniqueMap = new Map<string, Set<string>>()
  for (const r of uniqueRows) {
    const key = r.userId ? `u:${r.userId}` : r.ipAddress ? `i:${r.ipAddress}` : null
    if (!key) continue
    let set = uniqueMap.get(r.productId)
    if (!set) {
      set = new Set()
      uniqueMap.set(r.productId, set)
    }
    set.add(key)
  }

  return grouped.map((g) => {
    const p = productMap.get(g.productId)
    return {
      productId: g.productId,
      title: p?.title ?? "(đã xóa)",
      slug: p?.slug ?? "",
      thumbnail: p?.images[0]?.url ?? null,
      sellerName: p?.seller.name ?? "",
      categoryName: p?.category.name ?? "",
      brandName: p?.brand.name ?? "",
      views: g._count._all,
      uniqueViewers: uniqueMap.get(g.productId)?.size ?? 0,
      price: p ? Number(p.price) : 0,
    }
  })
}

/** Recent view log for the admin table. */
export async function getRecentViews(
  range: DateRange,
  limit = 50,
  scope?: AnalyticsScope & { productId?: string }
): Promise<RecentViewRow[]> {
  const where = buildViewWhere(range, scope)
  if (scope?.productId) {
    ;(where as Record<string, unknown>).productId = scope.productId
  }

  const rows = await prisma.productView.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      productId: true,
      ipAddress: true,
      createdAt: true,
      product: { select: { title: true, slug: true } },
      user: { select: { name: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.product.title,
    productSlug: r.product.slug,
    userName: r.user?.name ?? null,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt,
  }))
}

/**
 * Find products whose view count in the last 24h is at least `threshold`
 * times the daily average of the preceding 7 days.
 */
export async function getAnomalies(threshold = 3): Promise<AnomalyRow[]> {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const prev7dStart = new Date(now.getTime() - (7 + 1) * 24 * 60 * 60 * 1000)

  const [recentRows, baselineRows] = await Promise.all([
    prisma.productView.findMany({
      where: { createdAt: { gte: last24h, lte: now } },
      select: { productId: true },
    }),
    prisma.productView.findMany({
      where: { createdAt: { gte: prev7dStart, lt: last24h } },
      select: { productId: true },
    }),
  ])

  if (recentRows.length === 0) return []

  // Count views per product
  const recentCounts = new Map<string, number>()
  for (const r of recentRows) recentCounts.set(r.productId, (recentCounts.get(r.productId) ?? 0) + 1)

  const baselineCounts = new Map<string, number>()
  for (const r of baselineRows) baselineCounts.set(r.productId, (baselineCounts.get(r.productId) ?? 0) + 1)

  const candidates: Array<{
    productId: string
    viewsRecent: number
    viewsBaseline: number
    spikeRatio: number
  }> = []

  for (const [productId, viewsRecent] of recentCounts) {
    const baselineTotal = baselineCounts.get(productId) ?? 0
    const baselineDaily = baselineTotal / 7
    if (baselineDaily < 5) continue // ignore noise
    const ratio = viewsRecent / baselineDaily
    if (ratio >= threshold) {
      candidates.push({
        productId,
        viewsRecent,
        viewsBaseline: Math.round(baselineDaily),
        spikeRatio: ratio,
      })
    }
  }

  candidates.sort((a, b) => b.spikeRatio - a.spikeRatio)

  if (candidates.length === 0) return []

  const ids = candidates.map((c) => c.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      seller: { select: { name: true } },
    },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  return candidates.slice(0, 20).map((c) => {
    const p = productMap.get(c.productId)
    const severity: AnomalyRow["severity"] =
      c.spikeRatio >= 10 ? "high" : c.spikeRatio >= 5 ? "medium" : "low"
    return {
      productId: c.productId,
      title: p?.title ?? "(đã xóa)",
      sellerName: p?.seller.name ?? "",
      viewsRecent: c.viewsRecent,
      viewsBaseline: c.viewsBaseline,
      spikeRatio: Math.round(c.spikeRatio * 10) / 10,
      severity,
    }
  })
}

/**
 * Per-product view stats for a seller's dashboard.
 * Returns one row per active product of the seller.
 */
export async function getSellerProductStats(
  sellerId: string,
  range: DateRange
): Promise<SellerProductStat[]> {
  const products = await prisma.product.findMany({
    where: { sellerId, status: { not: "REJECTED" } },
    select: {
      id: true,
      title: true,
      status: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  if (products.length === 0) return []

  const ids = products.map((p) => p.id)
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const rows = await prisma.productView.findMany({
    where: {
      productId: { in: ids },
      createdAt: { gte: last30d, lte: now },
    },
    select: { productId: true, createdAt: true },
  })

  const counts: Record<
    string,
    { today: number; d7: number; d30: number; total: number }
  > = Object.fromEntries(ids.map((id) => [id, { today: 0, d7: 0, d30: 0, total: 0 }]))

  for (const r of rows) {
    const c = counts[r.productId]
    if (!c) continue
    if (r.createdAt >= last24h) c.today++
    if (r.createdAt >= last7d) c.d7++
    if (r.createdAt >= last30d) c.d30++
    c.total++
  }

  // total = viewCount từ Product là tổng all-time
  const totals = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, viewCount: true },
  })
  const totalMap = new Map(totals.map((t) => [t.id, t.viewCount]))

  return products.map((p) => ({
    productId: p.id,
    title: p.title,
    thumbnail: p.images[0]?.url ?? null,
    status: p.status,
    viewsTotal: totalMap.get(p.id) ?? 0,
    viewsToday: counts[p.id].today,
    viewsLast7d: counts[p.id].d7,
    viewsLast30d: counts[p.id].d30,
  }))
}