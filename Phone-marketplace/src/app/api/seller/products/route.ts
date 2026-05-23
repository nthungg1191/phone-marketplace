import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/seller/products - Danh sách sản phẩm của seller
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "100")

    const sellerId = session.user.role === "ADMIN" ? undefined : session.user.id

    const products = await prisma.product.findMany({
      where: sellerId ? { sellerId } : {},
      include: {
        brand: true,
        model: true,
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error("GET /api/seller/products error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
