import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/cart/count - Lấy số lượng sản phẩm trong giỏ hàng
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ count: 0 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: true,
      },
    })

    if (!cart) {
      return NextResponse.json({ count: 0 })
    }

    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("GET /api/cart/count error:", error)
    return NextResponse.json({ count: 0 })
  }
}
