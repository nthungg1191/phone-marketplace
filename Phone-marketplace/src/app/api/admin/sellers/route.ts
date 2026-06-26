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
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    // Build where clause
    const where: Record<string, unknown> = {}
    if (status && status !== "ALL") {
      where.sellerStatus = status
    } else {
      where.sellerStatus = { not: "NONE" }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    // Pagination
    const [total, sellers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          sellerStatus: true,
          isLocked: true,
          lockedReason: true,
          lockedAt: true,
          sellerRequestAt: true,
          sellerApprovedAt: true,
          sellerRejectedReason: true,
          idCardNumber: true,
          idCardName: true,
          idCardFrontUrl: true,
          idCardBackUrl: true,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Status counts
    const statusGroup = await prisma.user.groupBy({
      by: ["sellerStatus"],
      _count: true,
      where: { sellerStatus: { not: "NONE" } },
    })

    const statusCounts: Record<string, number> = { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }
    statusGroup.forEach((c) => {
      if (c.sellerStatus && statusCounts[c.sellerStatus] !== undefined) {
        statusCounts[c.sellerStatus] = c._count
        statusCounts.ALL += c._count
      }
    })

    // Count locked sellers (from approved)
    const lockedCount = await prisma.user.count({
      where: { sellerStatus: "APPROVED", isLocked: true },
    })
    const activeCount = await prisma.user.count({
      where: { sellerStatus: "APPROVED", isLocked: false },
    })

    // Daily counts (last 7 days)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const last7Days = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const dayStart = new Date(today)
        dayStart.setDate(dayStart.getDate() - (6 - i))
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)
        const approved = await prisma.user.count({
          where: { sellerApprovedAt: { gte: dayStart, lte: dayEnd } },
        })
        return {
          date: dayStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          approved,
        }
      })
    )

    // Counts by day
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)
    const approvedToday = await prisma.user.count({
      where: { sellerApprovedAt: { gte: today, lte: endOfToday } },
    })
    const rejectedToday = await prisma.user.count({
      where: {
        sellerStatus: "REJECTED",
        updatedAt: { gte: today, lte: endOfToday },
      },
    })
    const pendingToday = await prisma.user.count({
      where: { sellerStatus: "PENDING" },
    })

    return NextResponse.json({
      sellers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        ...statusCounts,
        ACTIVE: activeCount,
        LOCKED: lockedCount,
        APPROVED_TODAY: approvedToday,
        REJECTED_TODAY: rejectedToday,
        PENDING_TODAY: pendingToday,
      },
      chartData: last7Days,
    })
  } catch (error) {
    console.error("GET /api/admin/sellers error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
