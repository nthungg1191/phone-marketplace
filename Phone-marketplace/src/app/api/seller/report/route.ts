import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sellerId = session.user.id
    const { searchParams } = new URL(request.url)
    
    // Parse from/to date range
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const groupByParam = searchParams.get("groupBy") || "auto"

    // Calculate date range
    const now = new Date()
    now.setHours(23, 59, 59, 999) // end of today
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let fromDate: Date
    let toDate: Date = new Date(now)

    if (fromParam && toParam) {
      fromDate = new Date(fromParam)
      toDate = new Date(toParam)
      toDate.setHours(23, 59, 59, 999)
    } else {
      // Default: 30 ngày gần nhất
      fromDate = new Date(today)
      fromDate.setDate(fromDate.getDate() - 29)
    }

    // Validation
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: "from must be before to" },
        { status: 400 }
      )
    }

    if (toDate > now) {
      return NextResponse.json(
        { error: "Cannot select future dates" },
        { status: 400 }
      )
    }

    // Tối đa 1 năm
    const maxRange = 365 * 24 * 60 * 60 * 1000
    if (toDate.getTime() - fromDate.getTime() > maxRange) {
      return NextResponse.json(
        { error: "Date range cannot exceed 1 year" },
        { status: 400 }
      )
    }

    // Auto determine groupBy
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
    let groupBy: "day" | "week" | "month"
    if (groupByParam === "day" || groupByParam === "week" || groupByParam === "month") {
      groupBy = groupByParam
    } else {
      // Auto
      if (daysDiff <= 31) groupBy = "day"
      else if (daysDiff <= 180) groupBy = "week"
      else groupBy = "month"
    }

    // ============ Revenue Report ============
    const completedOrders = await prisma.order.findMany({
      where: {
        sellerId,
        status: "COMPLETED",
        completedAt: { gte: fromDate, lte: toDate }
      },
      select: {
        totalAmount: true,
        shippingFee: true,
        completedAt: true,
        createdAt: true
      }
    })

    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

    // ============ All orders in range ============
    const allOrders = await prisma.order.findMany({
      where: {
        sellerId,
        createdAt: { gte: fromDate, lte: toDate }
      },
      select: {
        status: true,
        totalAmount: true,
        createdAt: true
      }
    })

    // Group by period
    const revenueByPeriod = groupDataByPeriod(allOrders, completedOrders, fromDate, toDate, groupBy)

    // Orders by status
    const ordersByStatus = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalOrders = allOrders.length
    const completedCount = ordersByStatus["COMPLETED"] || 0
    const cancelledCount = ordersByStatus["CANCELLED"] || 0
    const returnedCount = ordersByStatus["REFUNDED"] || 0

    // ============ Products Report (all time) ============
    const products = await prisma.product.findMany({
      where: { sellerId },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        viewCount: true,
        images: { take: 1, select: { url: true } }
      }
    })

    const productSales = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { sellerId, status: "COMPLETED" }
      },
      _count: { productId: true },
      _sum: { price: true }
    })

    const productSalesMap = new Map(
      productSales.map(p => [p.productId, { count: p._count.productId, revenue: Number(p._sum.price) || 0 }])
    )

    const productsWithSales = products.map(product => ({
      id: product.id,
      title: product.title,
      price: Number(product.price),
      status: product.status,
      viewCount: product.viewCount,
      image: product.images[0]?.url,
      salesCount: productSalesMap.get(product.id)?.count || 0,
      salesRevenue: productSalesMap.get(product.id)?.revenue || 0
    }))

    const topProducts = [...productsWithSales]
      .filter(p => p.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 10)

    const lowStockProducts = productsWithSales
      .filter(p => p.status === "ACTIVE" && p.salesCount === 0 && p.viewCount > 10)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)

    // ============ Reviews (all time) ============
    const reviews = await prisma.review.findMany({
      where: { product: { sellerId } },
      select: {
        rating: true,
        accuracy: true,
        communication: true,
        delivery: true,
        createdAt: true
      }
    })

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    const ratingDistribution = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    // ============ Period Comparison ============
    // Tính % thay đổi so với kỳ trước
    const periodLength = toDate.getTime() - fromDate.getTime()
    const prevFromDate = new Date(fromDate.getTime() - periodLength - 1)
    const prevToDate = new Date(fromDate.getTime() - 1)

    const prevCompletedOrders = await prisma.order.findMany({
      where: {
        sellerId,
        status: "COMPLETED",
        completedAt: { gte: prevFromDate, lte: prevToDate }
      },
      select: { totalAmount: true }
    })

    const prevTotalOrders = await prisma.order.count({
      where: {
        sellerId,
        createdAt: { gte: prevFromDate, lte: prevToDate }
      }
    })

    const prevRevenue = prevCompletedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const prevCompletedCount = prevCompletedOrders.length

    const revenueChange = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0

    const ordersChange = prevTotalOrders > 0
      ? Math.round(((totalOrders - prevTotalOrders) / prevTotalOrders) * 100)
      : totalOrders > 0 ? 100 : 0

    const completedChange = prevCompletedCount > 0
      ? Math.round(((completedCount - prevCompletedCount) / prevCompletedCount) * 100)
      : completedCount > 0 ? 100 : 0

    const report = {
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
      groupBy,
      generatedAt: now.toISOString(),
      summary: {
        totalRevenue,
        totalOrders,
        completedOrders: completedCount,
        cancelledOrders: cancelledCount,
        returnedOrders: returnedCount,
        revenueChange,
        ordersChange,
        completedChange,
        avgOrderValue: completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0,
        prevRevenue,
        prevTotalOrders
      },
      revenueByPeriod,
      ordersByStatus,
      topProducts,
      lowStockProducts,
      reviews: {
        total: reviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
        distribution: ratingDistribution
      }
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error fetching seller report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Group orders by day/week/month
function groupDataByPeriod(
  allOrders: Array<{ status: string; totalAmount: { toString(): string } | number; createdAt: Date }>,
  completedOrders: Array<{ totalAmount: { toString(): string } | number; completedAt: Date | null; createdAt: Date }>,
  fromDate: Date,
  toDate: Date,
  groupBy: "day" | "week" | "month"
) {
  const result: Record<string, { revenue: number; orders: number }> = {}

  if (groupBy === "day") {
    // Khởi tạo tất cả các ngày trong khoảng
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
    for (let i = 0; i <= days; i++) {
      const date = new Date(fromDate)
      date.setDate(date.getDate() + i)
      const key = date.toISOString().split("T")[0]
      result[key] = { revenue: 0, orders: 0 }
    }

    completedOrders.forEach(order => {
      const completedDate = order.completedAt || order.createdAt
      const key = completedDate.toISOString().split("T")[0]
      if (result[key]) {
        result[key].revenue += Number(order.totalAmount)
        result[key].orders += 1
      }
    })
  } else if (groupBy === "week") {
    // Khởi tạo các tuần
    const weeks = Math.ceil((toDate.getTime() - fromDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    for (let i = 0; i <= weeks; i++) {
      const weekStart = new Date(fromDate)
      weekStart.setDate(weekStart.getDate() + i * 7)
      const key = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`
      result[key] = { revenue: 0, orders: 0 }
    }

    completedOrders.forEach(order => {
      const completedDate = order.completedAt || order.createdAt
      const weekStart = new Date(completedDate)
      weekStart.setDate(weekStart.getDate() - completedDate.getDay())
      const key = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`
      if (result[key]) {
        result[key].revenue += Number(order.totalAmount)
        result[key].orders += 1
      }
    })
  } else {
    // month
    const months = Math.ceil((toDate.getTime() - fromDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
    for (let i = 0; i <= months; i++) {
      const date = new Date(fromDate.getFullYear(), fromDate.getMonth() + i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      result[key] = { revenue: 0, orders: 0 }
    }

    completedOrders.forEach(order => {
      const completedDate = order.completedAt || order.createdAt
      const key = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}`
      if (result[key]) {
        result[key].revenue += Number(order.totalAmount)
        result[key].orders += 1
      }
    })
  }

  return Object.entries(result)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, ...data }))
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
