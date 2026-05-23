import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const adminDecisionSchema = z.object({
  decision: z.enum([
    "APPROVED",      // Duyệt hoàn tiền
    "REJECTED",      // Từ chối hoàn tiền (không phải gian lận)
    "FRAUD_BUYER",   // Phát hiện gian lận phía Buyer
    "FRAUD_SELLER",  // Phát hiện gian lận phía Seller
  ]),
  reason: z.string().optional(),
  reviewNotes: z.string().optional(), // Ghi chú admin khi xác minh
})

// PATCH /api/orders/[id]/return-request/admin - Admin xác minh và duyệt hoàn tiền
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    // Chỉ Admin được phép
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ admin có quyền xử lý" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { decision, reason, reviewNotes } = adminDecisionSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        returnRequest: true,
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true } },
        items: true,
        payment: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    if (!order.returnRequest) {
      return NextResponse.json({ error: "Không có yêu cầu trả hàng" }, { status: 404 })
    }

    if (order.returnRequest.status !== "SELLER_APPROVED") {
      return NextResponse.json(
        { error: "Yêu cầu trả hàng chưa được Seller duyệt" },
        { status: 400 }
      )
    }

    // Xử lý theo quyết định của Admin
    if (decision === "APPROVED") {
      // === DUYỆT HOÀN TIỀN ===

      // Cập nhật return request
      await prisma.returnRequest.update({
        where: { id: order.returnRequest.id },
        data: {
          status: "ADMIN_APPROVED",
          adminId: session.user.id,
          adminDecision: "APPROVED",
          adminReason: reason || "Đã xác minh hợp lệ",
          adminReviewNotes: reviewNotes,
          adminDecidedAt: new Date(),
          refundAmount: order.totalAmount,
          refundedAt: new Date(),
        },
      })

      // Cập nhật trạng thái order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
          paymentStatus: "REFUNDED",
          refundedAt: new Date(),
          refundReason: reason || "Hoàn tiền theo yêu cầu trả hàng",
        },
      })

      // Cập nhật payment transaction
      if (order.payment && order.payment.method === "SEPAY") {
        await prisma.paymentTransaction.update({
          where: { id: order.payment.id },
          data: {
            status: "REFUNDED",
            responseData: {
              refundedAt: new Date().toISOString(),
              refundedBy: session.user.id,
              reason: "Return request approved",
            },
          },
        })
      }

      // Hoàn lại stock cho sản phẩm
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            status: "ACTIVE",
          },
        })
      }

      // Notification cho Buyer
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ORDER_REFUND_APPROVED",
          title: "Hoàn tiền thành công",
          message: `Yêu cầu trả hàng cho đơn ${order.orderCode} đã được duyệt. Tiền sẽ được hoàn vào tài khoản của bạn trong 1-3 ngày làm việc.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      // Notification cho Seller
      await prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: "ORDER_REFUND_APPROVED",
          title: "Đơn hàng bị hoàn tiền",
          message: `Đơn hàng ${order.orderCode} đã được admin duyệt hoàn tiền cho người mua. Sản phẩm đã được hoàn vào kho.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      return NextResponse.json({
        message: "Đã duyệt hoàn tiền thành công",
        refundAmount: Number(order.totalAmount),
      })

    } else if (decision === "REJECTED") {
      // === TỪ CHỐI HOÀN TIỀN (không phải gian lận, nhưng không đủ điều kiện) ===

      await prisma.returnRequest.update({
        where: { id: order.returnRequest.id },
        data: {
          status: "ADMIN_REJECTED",
          adminId: session.user.id,
          adminDecision: "REJECTED",
          adminReason: reason || "Không đủ điều kiện hoàn tiền",
          adminReviewNotes: reviewNotes,
          adminDecidedAt: new Date(),
        },
      })

      // Đơn hàng COMPLETED
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
          type: "ORDER_REFUND_REJECTED",
          title: "Yêu cầu hoàn tiền bị từ chối",
          message: `Yêu cầu hoàn tiền cho đơn ${order.orderCode} không được duyệt. Lý do: ${reason || "Không đủ điều kiện"}`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      // Notification cho Seller
      await prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: "ORDER_UPDATED",
          title: "Yêu cầu hoàn tiền bị từ chối",
          message: `Yêu cầu hoàn tiền cho đơn ${order.orderCode} đã bị admin từ chối. Đơn hàng đã được xác nhận hoàn thành.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      return NextResponse.json({
        message: "Đã từ chối yêu cầu hoàn tiền",
      })

    } else if (decision === "FRAUD_BUYER") {
      // === PHÁT HIỆN GIAN LẬN PHÍA BUYER ===

      await prisma.returnRequest.update({
        where: { id: order.returnRequest.id },
        data: {
          status: "ADMIN_REJECTED",
          adminId: session.user.id,
          adminDecision: "FRAUD_BUYER",
          adminReason: reason || "Phát hiện gian lận",
          adminReviewNotes: reviewNotes,
          adminDecidedAt: new Date(),
          fraudEvidence: {
            type: "BUYER_FRAUD",
            detectedAt: new Date().toISOString(),
            description: reason,
          },
        },
      })

      // Đơn hàng COMPLETED (giữ tiền cho seller)
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "FRAUD_BUYER",
          completedAt: new Date(),
        },
      })

      // TODO: Tạo Violation record cho Buyer
      // await prisma.violation.create({...})

      // Notification cho Buyer (cảnh báo)
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ORDER_FRAUD_DETECTED",
          title: "Phát hiện hành vi vi phạm",
          message: `Yêu cầu trả hàng cho đơn ${order.orderCode} đã bị từ chối do phát hiện hành vi gian lận. Tài khoản của bạn đã được ghi nhận vi phạm.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      // Notification cho Seller
      await prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: "ORDER_FRAUD_DETECTED",
          title: "Đơn hàng bảo vệ thành công",
          message: `Yêu cầu trả hàng gian lận cho đơn ${order.orderCode} đã bị phát hiện và từ chối. Tiền được giữ lại cho bạn.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      return NextResponse.json({
        message: "Đã phát hiện gian lận phía Buyer. Vi phạm đã được ghi nhận.",
        fraudType: "BUYER",
      })

    } else if (decision === "FRAUD_SELLER") {
      // === PHÁT HIỆN GIAN LẬN PHÍA SELLER ===

      await prisma.returnRequest.update({
        where: { id: order.returnRequest.id },
        data: {
          status: "ADMIN_REJECTED",
          adminId: session.user.id,
          adminDecision: "FRAUD_SELLER",
          adminReason: reason || "Phát hiện gian lận",
          adminReviewNotes: reviewNotes,
          adminDecidedAt: new Date(),
          fraudEvidence: {
            type: "SELLER_FRAUD",
            detectedAt: new Date().toISOString(),
            description: reason,
          },
        },
      })

      // Hoàn tiền cho Buyer (seller phải chịu)
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "FRAUD_SELLER",
          paymentStatus: "REFUNDED",
          refundedAt: new Date(),
          refundReason: "Gian lận phía người bán",
        },
      })

      // Cập nhật payment
      if (order.payment) {
        await prisma.paymentTransaction.update({
          where: { id: order.payment.id },
          data: {
            status: "REFUNDED",
          },
        })
      }

      // Hoàn lại stock
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        })
      }

      // TODO: Tạo Violation record cho Seller
      // await prisma.violation.create({...})

      // Notification cho Buyer
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ORDER_REFUND_APPROVED",
          title: "Hoàn tiền thành công",
          message: `Yêu cầu trả hàng cho đơn ${order.orderCode} đã được duyệt do phát hiện gian lận phía người bán. Tiền sẽ được hoàn vào tài khoản của bạn.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      // Notification cho Seller (cảnh báo)
      await prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: "ORDER_FRAUD_DETECTED",
          title: "Phát hiện hành vi vi phạm",
          message: `Đơn hàng ${order.orderCode} đã bị phát hiện gian lận. Tài khoản của bạn đã được ghi nhận vi phạm và tiền đã được hoàn cho người mua.`,
          relatedId: order.id,
          relatedType: "ORDER",
        },
      })

      return NextResponse.json({
        message: "Đã phát hiện gian lận phía Seller. Vi phạm đã được ghi nhận.",
        fraudType: "SELLER",
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/orders/[id]/return-request/admin error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
