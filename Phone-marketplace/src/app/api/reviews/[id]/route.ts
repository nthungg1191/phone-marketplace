import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/reviews/[id] - Lấy chi tiết đánh giá
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        product: { 
          select: { 
            id: true, 
            title: true, 
            images: { where: { isPrimary: true }, take: 1 } 
          } 
        },
        order: { select: { orderCode: true } },
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Không tìm thấy đánh giá" }, { status: 404 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error("GET /api/reviews/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
