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
        return acc
      },
      { totalOrders: 0, pendingOrders: 0, completedOrders: 0 }
    )

    // Get total revenue (only from completed orders)
    const completedOrders = await prisma.order.findMany({
      where: { sellerId, status: "COMPLETED" },
      select: { totalAmount: true },
    })

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    )

    // Get rating stats
    const reviews = await prisma.review.aggregate({
      where: { product: { sellerId } },
      _avg: { rating: true },
      _count: { id: true },
    })

    const stats = {
      ...productStats,
      ...orderStats,
      totalRevenue,
      avgRating: reviews._avg.rating || 0,
      totalReviews: reviews._count.id,
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
