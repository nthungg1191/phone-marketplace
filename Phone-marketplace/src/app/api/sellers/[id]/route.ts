import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/sellers/[id] - Lấy thông tin seller profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const seller = await prisma.user.findUnique({
      where: { id, role: "SELLER" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone: true,
        sellerRank: true,
        sellerStatus: true,
        isLocked: true,
        lockedReason: true,
        createdAt: true,
        sellerStats: {
          select: {
            avgRating: true,
            totalTransactions: true,
            successRate: true,
            totalReviews: true,
          },
        },
      },
    })

    if (!seller) {
      return NextResponse.json({ error: "Không tìm thấy người bán" }, { status: 404 })
    }

    // Get products
    const products = await prisma.product.findMany({
      where: { 
        sellerId: id, 
        status: "ACTIVE",
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        brand: true,
        category: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    })

    // Get reviews
    const reviews = await prisma.review.findMany({
      where: { revieweeId: id },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        product: { select: { id: true, title: true, images: { where: { isPrimary: true }, take: 1 } } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return NextResponse.json({
      seller,
      products,
      reviews,
    })
  } catch (error) {
    console.error("GET /api/sellers/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
