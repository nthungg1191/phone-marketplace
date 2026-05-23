import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/users - Danh sách tất cả users
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") // BUYER, SELLER, ADMIN
    const search = searchParams.get("search") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}

    if (role && role !== "ALL") {
      where.role = role
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          isVerified: true,
          isLocked: true,
          createdAt: true,
          sellerStatus: true,
          sellerStats: {
            select: {
              avgRating: true,
              totalTransactions: true,
              successRate: true,
            },
          },
          _count: {
            select: {
              products: true,
              ordersAsBuyer: true,
              ordersAsSeller: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Đếm số lượng theo role
    const roleCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    })

    const counts = {
      ALL: total,
      BUYER: 0,
      SELLER: 0,
      ADMIN: 0,
    }

    roleCounts.forEach((c) => {
      if (c.role && counts[c.role as keyof typeof counts] !== undefined) {
        counts[c.role as keyof typeof counts] = c._count
      }
    })

    return NextResponse.json({
      users,
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/admin/users error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
