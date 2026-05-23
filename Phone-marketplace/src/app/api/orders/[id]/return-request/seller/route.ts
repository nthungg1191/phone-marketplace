import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const sellerDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(), // Bắt buộc nếu REJECTED
})

// PATCH /api/orders/[id]/return-request/seller - Seller quyết định về return request
export async function PATCH(
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
    const { decision, reason } = sellerDecisionSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        returnRequest: true,
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    // Check access
    const isSeller = order.sellerId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isSeller && !isAdmin) {
      return NextResponse.json({ error: "Chỉ người bán có thể xử lý" }, { status: 403 })
    }

    if (!order.returnRequest) {
      return NextResponse.json({ error: "Không có yêu cầu trả hàng" }, { status: 404 })
    }

    const returnRequest = order.returnRequest

    if (returnRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Yêu cầu trả hàng không ở trạng thái chờ duyệt" },
        { status: 400 }
      )
    }

    // Validate reject reason
    if (decision === "REJECTED" && !reason) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp lý do từ chối" },
        { status: 400 }
      )
    }

    if (decision === "APPROVED") {
      // Seller đồng ý → chờ Admin duyệt hoàn tiền
      await prisma.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: "SELLER_APPROVED",
          sellerId: session.user.id,
          sellerDecision: "APPROVED",
          sellerReason: reason || null,
          sellerDecidedAt: new Date(),
        },
      })

      // Cập nhật trạng thái order
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "RETURN_APPROVED" },
      })

      // Lấy danh sách Admin để gửi notification
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      })

      // Notification cho Buyer
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ORDER_RETURN_APPROVED_BY_SELLER",
          title: "Người bán đồng ý trả hàng",
          message: `Người bán đã đồng ý yêu cầu trả hàng cho đơn ${order.orderCode}. Đang chờ admin xác nhận hoàn tiền.`,
          relatedId: order.id,
          relatedType: "ORDER",
          data: { returnRequestId: returnRequest.id },
        },
      })

      // Notification cho tất cả Admin
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: "ORDER_RETURN_APPROVED_BY_SELLER",
              title: "Cần xác nhận hoàn tiền",
              message: `Seller đã đồng ý trả hàng cho đơn ${order.orderCode}. Vui lòng xác minh và duyệt hoàn tiền.`,
              relatedId: order.id,
              relatedType: "ORDER",
              data: { returnRequestId: returnRequest.id },
            },
          })
        )
      )

      return NextResponse.json({
        message: "Đã xác nhận đồng ý trả hàng. Đang chờ admin duyệt hoàn tiền.",
      })
    } else {
      // Seller từ chối → đơn trở về COMPLETED
      await prisma.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: "SELLER_REJECTED",
          sellerId: session.user.id,
          sellerDecision: "REJECTED",
          sellerReason: reason || "Không có lý do",
          sellerDecidedAt: new Date(),
        },
      })

      // Cập nhật trạng thái order về COMPLETED
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          buyerConfirmed: true,
          buyerConfirmedAt: new Date(),
        },
      })

      // Notification cho Buyer
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ORDER_RETURN_REJECTED_BY_SELLER",
          title: "Yêu cầu trả hàng bị từ chối",
          message: `Người bán đã từ chối yêu cầu trả hàng cho đơn ${order.orderCode}. Lý do: ${reason || "Không có lý do"}`,
          relatedId: order.id,
          relatedType: "ORDER",
          data: { returnRequestId: returnRequest.id },
        },
      })

      return NextResponse.json({
        message: "Đã từ chối yêu cầu trả hàng. Đơn hàng đã được xác nhận hoàn thành.",
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/orders/[id]/return-request/seller error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
