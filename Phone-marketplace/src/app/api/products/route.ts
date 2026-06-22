import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/products - Danh sách sản phẩm
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    const skip = (page - 1) * limit
    const myProducts = searchParams.get("myProducts") === "true"

    // Build filter
    const filterParams: Record<string, unknown> = {}
    for (const [key, value] of searchParams.entries()) {
      if (!["page", "limit", "sortBy", "sortOrder", "myProducts"].includes(key)) {
        if (key === "minPrice" || key === "maxPrice" || key === "minBatteryHealth" || key === "maxBatteryHealth") {
          filterParams[key] = parseInt(value)
        } else if (key === "ramGb" || key === "storageGb") {
          filterParams[key] = value.split(",").map(Number)
        } else if (key === "condition" || key === "color") {
          filterParams[key] = value.split(",")
        } else {
          filterParams[key] = value
        }
      }
    }

    // myProducts mode: show seller's own products (all statuses)
    let sellerId: string | undefined
    if (myProducts) {
      const session = await auth()
      if (!session?.user) {
        return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
      }
      sellerId = session.user.id
    }

    const where: Record<string, unknown> = {}

    if (myProducts && sellerId) {
      // Seller sees all their products regardless of status
      where.sellerId = sellerId
      if (filterParams.status) {
        where.status = filterParams.status
      }
    } else {
      // Public: only active products
      where.status = "ACTIVE"
    }

    if (filterParams.brandId) where.brandId = filterParams.brandId
    if (filterParams.modelId) where.modelId = filterParams.modelId
    if (filterParams.categoryId) where.categoryId = filterParams.categoryId
    if (filterParams.condition) where.condition = { in: filterParams.condition }
    if (filterParams.minPrice) where.price = { ...((where.price as object) || {}), gte: filterParams.minPrice }
    if (filterParams.maxPrice) where.price = { ...((where.price as object) || {}), lte: filterParams.maxPrice }
    if (filterParams.minBatteryHealth) where.batteryHealth = { gte: filterParams.minBatteryHealth }
    if (filterParams.maxBatteryHealth) where.batteryHealth = { ...((where.batteryHealth as object) || {}), lte: filterParams.maxBatteryHealth }
    if (filterParams.ramGb) where.ramGb = { in: filterParams.ramGb }
    if (filterParams.storageGb) where.storageGb = { in: filterParams.storageGb }
    if (filterParams.color) where.color = { in: filterParams.color }

    if (filterParams.search) {
      where.OR = [
        { title: { contains: filterParams.search as string, mode: "insensitive" } },
        { description: { contains: filterParams.search as string, mode: "insensitive" } },
        { brand: { name: { contains: filterParams.search as string, mode: "insensitive" } } },
      ]
    }

    const sortBy = (searchParams.get("sortBy") || "createdAt") as "createdAt" | "price" | "viewCount"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc"

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          model: true,
          images: { where: { isPrimary: true }, take: 1 },
          seller: {
            select: {
              id: true,
              name: true,
              avatar: true,
              sellerRank: true,
              sellerStats: true,
            },
          },
          _count: { select: { reviews: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/products error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
