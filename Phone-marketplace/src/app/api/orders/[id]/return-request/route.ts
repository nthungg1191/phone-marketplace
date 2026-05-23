import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createReturnRequestSchema = z.object({
  reason: z.enum([
    "WRONG_ITEM",
    "DAMAGED",
    "NOT_AS_DESCRIBED",
    "FAKE_PRODUCT",
    "CHANGED_MIND",
    "OTHER",
  ]),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
})

// GET /api/orders/[id]/return-request - Lấy thông tin return request
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        returnRequest: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Check access
    const isBuyer = order.buyerId === session.user.id
    const isSeller = order.sellerId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
    }

    if (!order.returnRequest) {
      return NextResponse.json({ error: "Không có yêu cầu trả hàng" }, { status: 404 })
    }

    return NextResponse.json({ returnRequest: order.returnRequest })
  } catch (error) {
    console.error("GET /api/orders/[id]/return-request error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/orders/[id]/return-request - Buyer tạo yêu cầu trả hàng
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = createReturnRequestSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        returnRequest: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Check access
    const isBuyer = order.buyerId === session.user.id
    if (!isBuyer) {
      return NextResponse.json({ error: "Chỉ người mua có thể yêu cầu trả hàng" }, { status: 403 })
    }

    // Kiểm tra điều kiện tạo return request
    if (!["DELIVERED", "RETURN_PERIOD"].includes(order.status)) {
      return NextResponse.json(
        { error: "Đơn hàng không trong thời gian dùng thử" },
        { status: 400 }
      )
    }

    // Kiểm tra đã hết hạn return period chưa
    if (order.returnPeriodEndsAt && new Date() > order.returnPeriodEndsAt) {
      return NextResponse.json(
        { error: "Đã hết thời gian yêu cầu trả hàng (14 ngày)" },
        { status: 400 }
      )
    }

    // Kiểm tra đã có return request chưa
    if (order.returnRequest) {
      return NextResponse.json(
        { error: "Đã có yêu cầu trả hàng cho đơn này" },
        { status: 400 }
      )
    }

    // Tạo return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        requestedById: session.user.id,
        reason: data.reason,
        description: data.description,
        images: data.images,
        status: "PENDING",
      },
    })

    // Cập nhật trạng thái order
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "RETURN_PENDING" },
    })

    // Tạo notification cho Seller
    await prisma.notification.create({
      data: {
        userId: order.sellerId,
        type: "ORDER_RETURN_REQUESTED",
        title: "Yêu cầu trả hàng mới",
        message: `Người mua yêu cầu trả hàng cho đơn ${order.orderCode}. Vui lòng xem xét và phản hồi.`,
        relatedId: order.id,
        relatedType: "ORDER",
        data: { returnRequestId: returnRequest.id },
      },
    })

    return NextResponse.json(
      {
        returnRequest,
        message: "Đã gửi yêu cầu trả hàng thành công",
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/orders/[id]/return-request error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/orders/[id]/return-request - Buyer hủy yêu cầu trả hàng
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        returnRequest: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Check access
    const isBuyer = order.buyerId === session.user.id
    if (!isBuyer) {
      return NextResponse.json({ error: "Chỉ người mua có thể hủy yêu cầu" }, { status: 403 })
    }

    if (!order.returnRequest) {
      return NextResponse.json({ error: "Không có yêu cầu trả hàng" }, { status: 404 })
    }

    // Chỉ cho hủy khi đang PENDING
    if (order.returnRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Không thể hủy yêu cầu đang được xử lý" },
        { status: 400 }
      )
    }

    // Cập nhật trạng thái return request
    await prisma.returnRequest.update({
      where: { id: order.returnRequest.id },
      data: { status: "CANCELLED" },
    })

    // Cập nhật trạng thái order về RETURN_PERIOD
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "RETURN_PERIOD",
        returnPeriodStartedAt: order.returnPeriodStartedAt || new Date(),
        returnPeriodEndsAt: order.returnPeriodEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    })

    // Tạo notification cho Seller
    await prisma.notification.create({
      data: {
        userId: order.sellerId,
        type: "ORDER_UPDATED",
        title: "Yêu cầu trả hàng đã bị hủy",
        message: `Người mua đã hủy yêu cầu trả hàng cho đơn ${order.orderCode}`,
        relatedId: order.id,
        relatedType: "ORDER",
      },
    })

    return NextResponse.json({ message: "Đã hủy yêu cầu trả hàng" })
  } catch (error) {
    console.error("DELETE /api/orders/[id]/return-request error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
