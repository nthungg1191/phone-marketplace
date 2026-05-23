import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createReviewSchema = z.object({
  orderId: z.string(),
  productId: z.string(),
  rating: z.number().min(1).max(5),
  accuracy: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  delivery: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
  photos: z.array(z.string()).default([]),
})

// GET /api/reviews - Lấy đánh giá (theo product hoặc user)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("productId")
    const sellerId = searchParams.get("sellerId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId
    if (sellerId) where.revieweeId = sellerId

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: { select: { id: true, name: true, avatar: true } },
          product: { select: { id: true, title: true, images: { where: { isPrimary: true }, take: 1 } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    // Calculate stats for product
    let stats = null
    if (productId) {
      const aggregate = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      })
      stats = {
        avgRating: aggregate._avg.rating || 0,
        totalReviews: aggregate._count.rating || 0,
      }
    }

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error) {
    console.error("GET /api/reviews error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/reviews - Tạo đánh giá
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const data = createReviewSchema.parse(body)

    // Check order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        items: true,
        reviews: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Only buyer can review
    if (order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Chỉ người mua có thể đánh giá" }, { status: 403 })
    }

    // Check order is completed
    if (!["COMPLETED", "REFUNDED"].includes(order.status)) {
      return NextResponse.json({ error: "Chỉ có thể đánh giá đơn hàng đã hoàn thành" }, { status: 400 })
    }

    // Check product is in order
    const orderItem = order.items.find(item => item.productId === data.productId)
    if (!orderItem) {
      return NextResponse.json({ error: "Sản phẩm không thuộc đơn hàng này" }, { status: 400 })
    }

    // Check already reviewed
    if (order.reviews.some(r => r.productId === data.productId)) {
      return NextResponse.json({ error: "Đã đánh giá sản phẩm này rồi" }, { status: 400 })
    }

    // Get seller
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { sellerId: true, title: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId: data.orderId,
        productId: data.productId,
        reviewerId: session.user.id,
        revieweeId: product.sellerId,
        rating: data.rating,
        accuracy: data.accuracy,
        communication: data.communication,
        delivery: data.delivery,
        comment: data.comment,
        photos: data.photos,
      },
    })

    // Update seller stats
    const sellerStats = await prisma.sellerStats.findUnique({
      where: { userId: product.sellerId },
    })

    if (sellerStats) {
      const newTotalReviews = sellerStats.totalReviews + 1
      const newAvgRating = ((Number(sellerStats.avgRating) * sellerStats.totalReviews) + data.rating) / newTotalReviews

      await prisma.sellerStats.update({
        where: { userId: product.sellerId },
        data: {
          totalReviews: newTotalReviews,
          avgRating: newAvgRating,
        },
      })
    }

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: product.sellerId,
        type: "ORDER_UPDATED", // REVIEW_RECEIVED - dùng tạm type có sẵn
        title: "Bạn nhận được đánh giá mới",
        message: `${session.user.name || "Người mua"} đã đánh giá ${data.rating}★ cho sản phẩm "${product.title}"`,
        relatedId: review.id,
        relatedType: "REVIEW",
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/reviews error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
