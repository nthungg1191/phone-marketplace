import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/sellers - Danh sách tất cả sellers và yêu cầu
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
    const status = searchParams.get("status") // NONE, PENDING, APPROVED, REJECTED

    const where: Record<string, unknown> = {}

    // Exclude NONE users — they are regular buyers who never requested to be sellers
    if (status) {
      where.sellerStatus = status
    } else {
      where.sellerStatus = { not: "NONE" }
    }

    const sellers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        sellerStatus: true,
        sellerRequestAt: true,
        sellerApprovedAt: true,
        sellerRejectedReason: true,
        createdAt: true,
        sellerStats: {
          select: {
            avgRating: true,
            totalTransactions: true,
            successRate: true,
            isIdentityVerified: true,
          },
        },
        _count: {
          select: {
            ordersAsSeller: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Count only real seller statuses (exclude NONE)
    const counts = await prisma.user.groupBy({
      by: ["sellerStatus"],
      _count: true,
      where: { sellerStatus: { not: "NONE" } },
    })

    const statusCounts = {
      ALL: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    }

    counts.forEach((c: { sellerStatus: string; _count: number }) => {
      if (c.sellerStatus && statusCounts[c.sellerStatus as keyof typeof statusCounts] !== undefined) {
        statusCounts[c.sellerStatus as keyof typeof statusCounts] = c._count
        statusCounts.ALL += c._count
      }
    })

    return NextResponse.json({ sellers, counts: statusCounts })
  } catch (error) {
    console.error("GET /api/admin/sellers error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
