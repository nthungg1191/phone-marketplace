import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/cart/buy-now - Mua ngay (thêm vào giỏ và chuyển đến checkout)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity = 1 } = body

    if (!productId) {
      return NextResponse.json({ error: "Thiếu productId" }, { status: 400 })
    }

    if (quantity < 1 || quantity > 10) {
      return NextResponse.json({ error: "Số lượng phải từ 1 đến 10" }, { status: 400 })
    }

    // Check product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        sellerId: true,
        title: true,
        price: true,
        stock: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    if (product.status !== "ACTIVE") {
      return NextResponse.json({ error: "Sản phẩm không còn khả dụng" }, { status: 400 })
    }

    if (product.sellerId === session.user.id) {
      return NextResponse.json({ error: "Không thể mua sản phẩm của chính bạn" }, { status: 400 })
    }

    // Check stock
    if (product.stock !== null && quantity > product.stock) {
      return NextResponse.json({ error: `Chỉ còn ${product.stock} sản phẩm trong kho` }, { status: 400 })
    }

    const finalPrice = Number(product.price)

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id },
      })
    }

    // Check if product from same seller already in cart
    // For "buy now", we clear other sellers' items and keep only this product
    const existingItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: { select: { sellerId: true } } },
    })

    // Remove items from other sellers (keep only this seller's products)
    for (const item of existingItems) {
      if (item.product.sellerId !== product.sellerId) {
        await prisma.cartItem.delete({ where: { id: item.id } })
      }
    }

    // Check if this product is already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    })

    if (existingItem) {
      // Update quantity
      const newQuantity = Math.min(existingItem.quantity + quantity, 10)
      if (product.stock !== null && newQuantity > product.stock) {
        return NextResponse.json({ error: `Chỉ còn ${product.stock} sản phẩm trong kho` }, { status: 400 })
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      })
    } else {
      // Add new item to cart
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
          price: finalPrice,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Đã thêm vào giỏ hàng",
      checkoutUrl: "/checkout",
      finalPrice: finalPrice,
    })
  } catch (error) {
    console.error("POST /api/cart/buy-now error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
