import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/sellers/[id]/products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params

    const products = await prisma.product.findMany({
      where: { sellerId: id },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        brand: true,
        category: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error("GET /api/admin/sellers/[id]/products error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
