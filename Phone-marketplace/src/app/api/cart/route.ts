import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/cart - Lấy giỏ hàng
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
                images: { where: { isPrimary: true }, take: 1 },
                seller: {
                  select: {
                    id: true,
                    name: true,
                    sellerRank: true,
                  },
                },
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
    })

    // Create cart if not exists
    if (!cart) {
      const newCart = await prisma.cart.create({
        data: { userId: session.user.id },
        include: {
          items: true,
        },
      })
      return NextResponse.json({
        cart: newCart,
        itemCount: 0,
        total: 0,
      })
    }

    const total = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity
    }, 0)

    return NextResponse.json({
      cart,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      total,
    })
  } catch (error) {
    console.error("GET /api/cart error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/cart - Thêm vào giỏ hàng
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
      return NextResponse.json({ error: "Không thể thêm sản phẩm của chính bạn" }, { status: 400 })
    }

    // Check stock
    if (product?.stock !== null && quantity > product.stock) {
      return NextResponse.json({ error: `Chỉ còn ${product.stock} sản phẩm trong kho` }, { status: 400 })
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id },
      })
    }

    // Check if already in cart
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
      
      return NextResponse.json({ 
        message: `Đã cập nhật số lượng sản phẩm lên ${newQuantity}`,
        quantity: newQuantity,
      }, { status: 200 })
    }

    // Add new item to cart
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: productId,
        quantity: quantity,
      },
    })

    return NextResponse.json({ message: "Đã thêm vào giỏ hàng", quantity }, { status: 201 })
  } catch (error) {
    console.error("POST /api/cart error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/cart - Cập nhật số lượng
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity } = body

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: "Thiếu productId hoặc quantity" }, { status: 400 })
    }

    if (quantity < 1) {
      // If quantity < 1, remove from cart
      return NextResponse.json({ message: "Đã xóa sản phẩm" }, { status: 200 })
    }

    if (quantity > 10) {
      return NextResponse.json({ error: "Số lượng tối đa là 10" }, { status: 400 })
    }

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    })

    if (!cart) {
      return NextResponse.json({ error: "Không tìm thấy giỏ hàng" }, { status: 404 })
    }

    // Check if item exists in cart
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    })

    if (!cartItem) {
      return NextResponse.json({ error: "Sản phẩm không có trong giỏ hàng" }, { status: 404 })
    }

    // Check stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    })

    if (product && product.stock !== null && quantity > product.stock) {
      return NextResponse.json({ error: `Chỉ còn ${product.stock} sản phẩm trong kho` }, { status: 400 })
    }

    // Update quantity
    if (quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: cartItem.id },
      })
      return NextResponse.json({ message: "Đã xóa sản phẩm khỏi giỏ hàng" })
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    })

    return NextResponse.json({ message: "Đã cập nhật số lượng", quantity })
  } catch (error) {
    console.error("PATCH /api/cart error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
