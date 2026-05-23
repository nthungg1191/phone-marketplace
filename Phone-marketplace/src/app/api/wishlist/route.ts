import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/wishlist - Lấy danh sách yêu thích
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const items = await prisma.wishlist.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            brand: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            seller: {
              select: {
                id: true,
                name: true,
                avatar: true,
                sellerRank: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("GET /api/wishlist error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/wishlist - Thêm vào yêu thích
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: "Thiếu productId" }, { status: 400 })
    }

    // Check product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, sellerId: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    if (product.status !== "ACTIVE") {
      return NextResponse.json({ error: "Sản phẩm không còn khả dụng" }, { status: 400 })
    }

    if (product.sellerId === session.user.id) {
      return NextResponse.json({ error: "Không thể yêu thích sản phẩm của chính bạn" }, { status: 400 })
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Sản phẩm đã có trong danh sách yêu thích" }, { status: 400 })
    }

    const item = await prisma.wishlist.create({
      data: {
        userId: session.user.id,
        productId,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error("POST /api/wishlist error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
