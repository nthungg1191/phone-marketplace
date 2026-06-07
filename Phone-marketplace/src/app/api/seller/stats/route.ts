import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sellerId = session.user.id

    // Get product stats
    const products = await prisma.product.groupBy({
      by: ["status"],
      where: { sellerId },
      _count: { id: true },
    })

    const productStats = products.reduce(
      (acc, curr) => {
        acc.totalProducts += curr._count.id
        if (curr.status === "ACTIVE") acc.activeProducts += curr._count.id
        if (curr.status === "PENDING") acc.pendingProducts += curr._count.id
        if (curr.status === "SOLD") acc.soldProducts += curr._count.id
        return acc
      },
      { totalProducts: 0, activeProducts: 0, pendingProducts: 0, soldProducts: 0 }
    )

    // Get order stats
    const orders = await prisma.order.groupBy({
      by: ["status"],
      where: { sellerId },
      _count: { id: true },
    })

    const orderStats = orders.reduce(
      (acc, curr) => {
        acc.totalOrders += curr._count.id
        if (
          curr.status === "PENDING_PAYMENT" ||
          curr.status === "PAID" ||
          curr.status === "CONFIRMED"
        ) {
          acc.pendingOrders += curr._count.id
        }
        if (curr.status === "COMPLETED") acc.completedOrders += curr._count.id
        if (curr.status === "CANCELLED") acc.cancelledOrders += curr._count.id
        if (
          curr.status === "SHIPPING" ||
          curr.status === "DELIVERED" ||
          curr.status === "RECEIVED" ||
          curr.status === "RETURN_PERIOD"
        ) {
          acc.shippingOrders += curr._count.id
        }
        // Store orders by status
        acc.ordersByStatus[curr.status] = curr._count.id
        return acc
      },
      { 
        totalOrders: 0, 
        pendingOrders: 0, 
        completedOrders: 0,
        cancelledOrders: 0,
        shippingOrders: 0,
        ordersByStatus: {} as Record<string, number>
      }
    )

    // Get total revenue (only from completed orders)
    const completedOrdersData = await prisma.order.findMany({
      where: { sellerId, status: "COMPLETED" },
      select: { totalAmount: true, createdAt: true }
    })

    const totalRevenue = completedOrdersData.reduce(
      (sum, order) => sum + Number(order.totalAmount), 
      0
    )

    // Calculate revenue change (this month vs last month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonthRevenue = completedOrdersData
      .filter(o => new Date(o.createdAt) >= startOfMonth)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0)

    const lastMonthRevenue = completedOrdersData
      .filter(o => {
        const date = new Date(o.createdAt)
        return date >= startOfLastMonth && date <= endOfLastMonth
      })
      .reduce((sum, o) => sum + Number(o.totalAmount), 0)

    let revenueChange = 0
    if (lastMonthRevenue > 0) {
      revenueChange = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    } else if (thisMonthRevenue > 0) {
      revenueChange = 100
    }

    // Get rating stats
    const reviews = await prisma.review.aggregate({
      where: { product: { sellerId } },
      _avg: { rating: true },
      _count: { id: true },
    })

    // Get orders by day (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentOrders = await prisma.order.findMany({
      where: {
        sellerId,
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        createdAt: true,
        totalAmount: true,
        status: true
      },
      orderBy: { createdAt: "asc" }
    })

    // Group orders by day
    const ordersByDay: Record<string, { count: number; revenue: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split("T")[0]
      ordersByDay[key] = { count: 0, revenue: 0 }
    }

    recentOrders.forEach(order => {
      const key = order.createdAt.toISOString().split("T")[0]
      if (ordersByDay[key]) {
        ordersByDay[key].count++
        if (order.status === "COMPLETED") {
          ordersByDay[key].revenue += Number(order.totalAmount)
        }
      }
    })

    // Get top products by sales
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          sellerId,
          status: "COMPLETED"
        }
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: "desc" }
      },
      take: 5
    })

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            images: {
              take: 1,
              select: { url: true }
            }
          }
        })
        return product ? {
          ...product,
          salesCount: item._count.productId
        } : null
      })
    )

    // Get recent reviews
    const recentReviews = await prisma.review.findMany({
      where: { product: { sellerId } },
      include: {
        reviewer: {
          select: { name: true, avatar: true }
        },
        product: {
          select: { title: true, slug: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })

    // Calculate success rate
    const successRate = orderStats.totalOrders > 0
      ? Math.round((orderStats.completedOrders / orderStats.totalOrders) * 100)
      : 0

    // Cancellation rate
    const cancellationRate = orderStats.totalOrders > 0
      ? Math.round((orderStats.cancelledOrders / orderStats.totalOrders) * 100)
      : 0

    const stats = {
      ...productStats,
      totalOrders: orderStats.totalOrders,
      pendingOrders: orderStats.pendingOrders,
      completedOrders: orderStats.completedOrders,
      cancelledOrders: orderStats.cancelledOrders,
      shippingOrders: orderStats.shippingOrders,
      ordersByStatus: orderStats.ordersByStatus,
      totalRevenue,
      thisMonthRevenue,
      revenueChange,
      avgRating: reviews._avg.rating || 0,
      totalReviews: reviews._count.id,
      successRate,
      cancellationRate,
      ordersByDay: Object.entries(ordersByDay).map(([date, data]) => ({
        date,
        ...data
      })),
      topProducts: topProductsWithDetails.filter(Boolean),
      recentReviews
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching seller stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
