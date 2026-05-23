import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/stores/[id] - Lấy thông tin store profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get("brand")
    const condition = searchParams.get("condition")
    const sort = searchParams.get("sort") || "newest"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const store = await prisma.user.findUnique({
      where: { id, role: "SELLER" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone: true,
        sellerRank: true,
        sellerStatus: true,
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

    if (!store) {
      return NextResponse.json({ error: "Không tìm thấy cửa hàng" }, { status: 404 })
    }

    // Build product filter
    const productWhere: any = {
      sellerId: id,
      status: "ACTIVE",
    }
    if (brand) productWhere.brandId = brand
    if (condition) productWhere.condition = condition

    // Sort options
    const orderBy: any = { createdAt: "desc" }
    if (sort === "price_asc") orderBy.price = "asc"
    else if (sort === "price_desc") orderBy.price = "desc"
    else if (sort === "rating") orderBy.reviews = { _count: "desc" }

    // Get products with pagination
    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          brand: true,
          category: true,
          _count: { select: { reviews: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where: productWhere }),
    ])

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

    // Get available brands for filter
    const brands = await prisma.product.groupBy({
      by: ["brandId"],
      where: { sellerId: id, status: "ACTIVE" },
      _count: true,
    })
    const brandIds = brands.map((b) => b.brandId)
    const brandList = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, slug: true },
    })

    return NextResponse.json({
      store,
      products,
      reviews,
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
      filters: {
        brands: brandList,
      },
    })
  } catch (error) {
    console.error("GET /api/stores/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
