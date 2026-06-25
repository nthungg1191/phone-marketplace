import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { sendOrderConfirmationEmail } from "@/lib/email"

interface CartItem {
  productId: string
  quantity: number
  offerId?: string | null
}

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(10).default(1),
    offerId: z.string().optional(),
  })).min(1, "Cần ít nhất 1 sản phẩm"),
  addressId: z.string().optional(),
  shippingAddress: z.string().optional(),
  phone: z.string().optional(),
  paymentMethod: z.enum(["SEPAY", "COD"]),
})

// GET /api/orders - Danh sách đơn hàng
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const role = searchParams.get("role") || "buyer" // buyer or seller
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const isSeller = session.user.role === "SELLER" || session.user.role === "ADMIN"

    // Build where clause
    // If role=seller AND user is a seller, show seller orders
    // Otherwise, always show buyer orders (default)
    const where: Record<string, unknown> = {}

    if (role === "seller" && isSeller) {
      where.sellerId = session.user.id
    } else {
      // Default: show orders where user is the buyer
      where.buyerId = session.user.id
    }

    if (status) {
      where.status = status
    }

    console.log(`[Orders API] User: ${session.user.id}, Role: ${session.user.role}, Query role: ${role}, Where:`, JSON.stringify(where))

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, sellerRank: true } },
          items: {
            include: {
              product: {
                select: { id: true, title: true, slug: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // Format orders
    const formattedOrders = orders.map(order => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
      })),
    }))

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/orders error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/orders - Tạo đơn hàng mới
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const data = createOrderSchema.parse(body)

    // Get cart items with offer and price info
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, sellerId: true, title: true, price: true, stock: true, images: true },
            },
            offer: {
              select: { id: true, status: true, finalPrice: true, offeredPrice: true },
            },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Giỏ hàng trống" }, { status: 400 })
    }

    // Get product IDs from cart items
    const cartProductIds = cart.items.map(item => item.productId)

    // Validate products
    const products = await prisma.product.findMany({
      where: { id: { in: cartProductIds }, status: "ACTIVE" },
      select: {
        id: true,
        sellerId: true,
        title: true,
        price: true,
        stock: true,
        brand: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    })

    // Check stock for each product
    for (const item of cart.items) {
      const product = products.find(p => p.id === item.productId)
      if (product && product.stock !== null && product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Sản phẩm "${product.title}" chỉ còn ${product.stock} trong kho` },
          { status: 400 }
        )
      }
    }

    // Group by seller
    const ordersBySeller = new Map<string, { items: typeof cart.items, priceMap: Map<string, { price: number, offerId?: string }> }>()

    for (const item of cart.items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) continue

      // Determine the price priority:
      // 1. From accepted offer (finalPrice)
      // 2. From cart item price (negotiated but not yet accepted)
      // 3. From product price (default)
      let price = Number(product.price)
      
      // Check if cart item has an offer with ACCEPTED status
      if (item.offer && item.offer.status === "ACCEPTED" && item.offer.finalPrice) {
        price = Number(item.offer.finalPrice)
      } else if (item.price) {
        price = Number(item.price)
      }

      if (!ordersBySeller.has(product.sellerId)) {
        ordersBySeller.set(product.sellerId, { items: [], priceMap: new Map() })
      }
      ordersBySeller.get(product.sellerId)!.items.push(item)
      ordersBySeller.get(product.sellerId)!.priceMap.set(item.productId, {
        price,
        offerId: item.offerId || undefined,
      })
    }

    // Create order for each seller
    const createdOrders = []

    for (const [sellerId, sellerData] of ordersBySeller) {
      // Calculate subtotal using negotiated prices
      let subtotal = 0
      for (const item of sellerData.items) {
        const priceInfo = sellerData.priceMap.get(item.productId)
        if (priceInfo) {
          subtotal += priceInfo.price * item.quantity
        }
      }

      // Generate order code
      const orderCode = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      // Build shipping address
      let shippingAddress = data.shippingAddress || ""
      if (!shippingAddress && data.addressId) {
        const savedAddress = await prisma.address.findFirst({
          where: { id: data.addressId, userId: session.user.id },
        })
        if (savedAddress) {
          shippingAddress = `${savedAddress.fullName} - ${savedAddress.phone} - ${savedAddress.street}, ${savedAddress.wardName || savedAddress.district}, ${savedAddress.provinceName || savedAddress.city}`
        }
      }
      if (!shippingAddress && data.phone) {
        shippingAddress = `${session.user.name || "Khách hàng"} - ${data.phone}`
      }

      // COD: start at CONFIRMED immediately, SEPAY: start at PENDING_PAYMENT
      const isCOD = data.paymentMethod === "COD"
      const orderStatus = isCOD ? "CONFIRMED" : "PENDING_PAYMENT"

      // SEPAY: 30 phút thanh toán, COD: không cần
      const paymentDeadline = isCOD ? null : new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

      const order = await prisma.order.create({
        data: {
          orderCode,
          buyerId: session.user.id,
          sellerId,
          shippingAddress,
          subtotal,
          shippingFee: 0,
          totalAmount: subtotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: "PENDING",
          status: orderStatus,
          confirmedAt: isCOD ? new Date() : null,
          paymentDeadline,
          items: {
            create: sellerData.items.map((item: CartItem) => {
              const product = products.find(p => p.id === item.productId)!
              const priceInfo = sellerData.priceMap.get(item.productId)!
              return {
                productId: product.id,
                title: product.title,
                price: priceInfo.price, // Use negotiated price
                image: product.images[0]?.url || "",
                quantity: item.quantity,
                offerId: priceInfo.offerId,
              }
            }),
          },
        },
        include: {
          items: true,
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true } },
        },
      })

      // Update product stock (only if stock is not null)
      for (const item of sellerData.items) {
        const product = products.find(p => p.id === item.productId)
        if (product && product.stock !== null) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: sellerId,
          type: "ORDER_CREATED",
          title: "Có đơn hàng mới",
          message: `Bạn có đơn hàng mới từ ${session.user.name}`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      createdOrders.push(order)
    }

    // Send confirmation email to buyer (async, non-blocking)
    const primaryOrder = createdOrders[0]
    if (primaryOrder && primaryOrder.buyer.email) {
      sendOrderConfirmationEmail({
        to: primaryOrder.buyer.email,
        buyerName: primaryOrder.buyer.name || "Khách hàng",
        orderCode: primaryOrder.orderCode,
        totalAmount: Number(primaryOrder.totalAmount),
        items: primaryOrder.items.map((item) => ({
          title: item.title,
          price: Number(item.price),
          quantity: item.quantity,
          image: item.image,
        })),
        shippingAddress: primaryOrder.shippingAddress,
        paymentMethod: data.paymentMethod,
        paymentDeadline: primaryOrder.paymentDeadline
          ? new Date(primaryOrder.paymentDeadline).toLocaleString("vi-VN")
          : null,
      })
    }

    // Clear cart items for this user
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      })
    }

    return NextResponse.json({ 
      order: createdOrders[0],
      orders: createdOrders,
      message: `Đã tạo ${createdOrders.length} đơn hàng` 
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/orders error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
