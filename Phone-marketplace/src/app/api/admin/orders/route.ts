import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/admin/orders - Danh sách tất cả đơn hàng
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const paymentStatus = searchParams.get("paymentStatus")
    const search = searchParams.get("search") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const userId = searchParams.get("userId")
    const sellerId = searchParams.get("sellerId")

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (userId) {
      where.buyerId = userId
    }

    if (sellerId) {
      where.sellerId = sellerId
    }

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: "insensitive" } },
        { buyer: { name: { contains: search, mode: "insensitive" } } },
        { buyer: { email: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          seller: { select: { id: true, name: true, avatar: true, sellerStats: { select: { avgRating: true } } } },
          items: {
            include: {
              product: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
          returnRequest: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // Đếm theo status
    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      _count: true,
    })

    const paymentCounts = await prisma.order.groupBy({
      by: ["paymentStatus"],
      _count: true,
    })

    const counts = {
      total,
      byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
      byPaymentStatus: Object.fromEntries(paymentCounts.map(s => [s.paymentStatus, s._count])),
    }

    return NextResponse.json({
      orders,
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/admin/orders error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
