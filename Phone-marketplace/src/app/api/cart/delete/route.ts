import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// DELETE /api/cart - Xóa sản phẩm khỏi giỏ hàng
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json({ error: "Thiếu productId" }, { status: 400 })
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    })

    if (!cart) {
      return NextResponse.json({ error: "Giỏ hàng không tồn tại" }, { status: 404 })
    }

    // Delete item
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: productId,
      },
    })

    return NextResponse.json({ message: "Đã xóa khỏi giỏ hàng" })
  } catch (error) {
    console.error("DELETE /api/cart error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/cart - Cập nhật giỏ hàng (xóa nhiều sản phẩm)
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { action, productIds } = body

    if (action === "clear") {
      // Clear entire cart
      const cart = await prisma.cart.findUnique({
        where: { userId: session.user.id },
      })

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        })
      }

      return NextResponse.json({ message: "Đã xóa toàn bộ giỏ hàng" })
    }

    if (action === "remove" && productIds && Array.isArray(productIds)) {
      // Remove multiple items
      const cart = await prisma.cart.findUnique({
        where: { userId: session.user.id },
      })

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            productId: { in: productIds },
          },
        })
      }

      return NextResponse.json({ message: "Đã xóa các sản phẩm đã chọn" })
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (error) {
    console.error("PATCH /api/cart error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
