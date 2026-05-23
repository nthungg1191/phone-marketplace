import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "SHIPPING",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
})

// GET /api/admin/orders/[id] - Chi tiết đơn hàng
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, name: true, email: true, phone: true, avatar: true },
        },
        seller: {
          select: { id: true, name: true, email: true, avatar: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
        returnRequest: true,
        payment: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/admin/orders/[id] - Cập nhật đơn hàng
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateOrderSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPING", "CANCELLED"],
      SHIPPING: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["COMPLETED"],
      COMPLETED: [],
      CANCELLED: [],
    }

    if (data.status && data.status !== order.status) {
      if (!validTransitions[order.status]?.includes(data.status)) {
        return NextResponse.json(
          { error: `Không thể chuyển từ ${order.status} sang ${data.status}` },
          { status: 400 }
        )
      }

      // Nếu hủy, restore sản phẩm
      if (data.status === "CANCELLED") {
        await prisma.product.updateMany({
          where: { id: { in: order.items.map(i => i.productId) } },
          data: { status: "ACTIVE" },
        })
      }
    }

    // Update order
    const updateData: Record<string, unknown> = {}
    if (data.status) updateData.status = data.status
    if (data.paymentStatus) updateData.paymentStatus = data.paymentStatus

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    })

    // Notification cho buyer
    if (data.status && data.status !== order.status) {
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ORDER_UPDATED",
          title: `Đơn hàng ${order.orderCode} đã được cập nhật`,
          message: `Trạng thái: ${data.status}`,
          relatedId: id,
          relatedType: "ORDER",
        },
      })
    }

    return NextResponse.json({ order: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/admin/orders/[id] - Xóa đơn hàng (chỉ đơn PENDING hoặc CANCELLED)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    if (!["PENDING", "CANCELLED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Chỉ có thể xóa đơn hàng đang chờ hoặc đã hủy" },
        { status: 400 }
      )
    }

    await prisma.order.delete({ where: { id } })

    return NextResponse.json({ message: "Đã xóa đơn hàng" })
  } catch (error) {
    console.error("DELETE /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
