import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sellerId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")

    const whereClause: Prisma.OrderWhereInput = { sellerId }
    if (status) {
      whereClause.status = status as Prisma.OrderWhereInput["status"]
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        buyer: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
        items: {
          select: {
            id: true,
            productId: true,
            title: true,
            price: true,
            image: true,
            quantity: true,
          },
        },
      },
    })

    // Format orders for response
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      buyer: order.buyer,
      itemCount: order.items.length,
      items: order.items,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error) {
    console.error("Error fetching seller orders:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
