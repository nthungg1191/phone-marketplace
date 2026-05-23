import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/products/[id]/view - Increment view count (client-side)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if already viewed this session
    const viewedKey = `viewed_product_${id}`
    if (typeof window !== "undefined") {
      const alreadyViewed = sessionStorage.getItem(viewedKey)
      if (alreadyViewed) {
        return NextResponse.json({ success: true, message: "Already viewed" })
      }
    }

    // Increment view count
    const product = await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    })

    // Mark as viewed in session
    if (typeof window !== "undefined") {
      sessionStorage.setItem(viewedKey, "true")
    }

    return NextResponse.json({ success: true, viewCount: product.viewCount })
  } catch (error) {
    console.error("POST /api/products/[id]/view error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
