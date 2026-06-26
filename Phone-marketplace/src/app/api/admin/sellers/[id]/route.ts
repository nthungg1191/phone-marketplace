import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "LOCK", "UNLOCK"]),
  reason: z.string().max(500).optional(),
})

// GET /api/admin/sellers/[id] - Chi tiết seller
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        isLocked: true,
        lockedReason: true,
        lockedAt: true,
        sellerStatus: true,
        sellerRequestAt: true,
        sellerApprovedAt: true,
        sellerRejectedReason: true,
        idCardNumber: true,
        idCardName: true,
        idCardFrontUrl: true,
        idCardBackUrl: true,
        createdAt: true,
        sellerStats: {
          select: {
            avgRating: true,
            totalTransactions: true,
            successfulDeals: true,
            cancelledDeals: true,
            totalRevenue: true,
            avgResponseTimeMin: true,
            successRate: true,
            isIdentityVerified: true,
            identityVerifiedAt: true,
          },
        },
        addresses: {
          where: { isDefault: true },
          select: {
            id: true,
            fullName: true,
            phone: true,
            street: true,
            wardName: true,
            provinceName: true,
          },
          take: 1,
        },
        _count: {
          select: {
            ordersAsSeller: true,
            products: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/admin/sellers/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/admin/sellers/[id] - Duyệt/từ chối/khoá/mở khoá seller
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
    const { action, reason } = actionSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, sellerStatus: true, isLocked: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    if (action === "APPROVE") {
      if (user.sellerStatus !== "PENDING") {
        return NextResponse.json({ error: "Yêu cầu này đã được xử lý" }, { status: 400 })
      }
      await prisma.user.update({
        where: { id },
        data: {
          role: "SELLER",
          sellerStatus: "APPROVED",
          sellerApprovedAt: new Date(),
        },
      })
      await prisma.sellerStats.upsert({
        where: { userId: id },
        create: {
          userId: id,
          isIdentityVerified: true,
          identityVerifiedAt: new Date(),
        },
        update: {
          isIdentityVerified: true,
          identityVerifiedAt: new Date(),
        },
      })
      await prisma.notification.create({
        data: {
          userId: id,
          type: "PRODUCT_APPROVED",
          title: "Yêu cầu được duyệt!",
          message: "Chúc mừng! Yêu cầu trở thành người bán của bạn đã được duyệt. Bây giờ bạn có thể đăng bán sản phẩm.",
          relatedType: "SELLER_STATUS",
        },
      })
      return NextResponse.json({ message: "Đã duyệt người bán" })
    }

    if (action === "REJECT") {
      if (user.sellerStatus !== "PENDING") {
        return NextResponse.json({ error: "Yêu cầu này đã được xử lý" }, { status: 400 })
      }
      await prisma.user.update({
        where: { id },
        data: {
          sellerStatus: "REJECTED",
          sellerRejectedReason: reason || "Yêu cầu không được chấp nhận",
        },
      })
      await prisma.notification.create({
        data: {
          userId: id,
          type: "PRODUCT_REJECTED",
          title: "Yêu cầu bị từ chối",
          message: reason || "Yêu cầu trở thành người bán của bạn không được chấp nhận. Vui lòng thử lại sau.",
          relatedType: "SELLER_STATUS",
        },
      })
      return NextResponse.json({ message: "Đã từ chối yêu cầu" })
    }

    if (action === "LOCK") {
      if (user.isLocked) {
        return NextResponse.json({ error: "Cửa hàng đã bị khoá" }, { status: 400 })
      }
      if (user.sellerStatus !== "APPROVED") {
        return NextResponse.json({ error: "Chỉ có thể khoá cửa hàng đã được duyệt" }, { status: 400 })
      }
      await prisma.user.update({
        where: { id },
        data: {
          isLocked: true,
          lockedAt: new Date(),
          lockedReason: reason || "Vi phạm quy định của sàn",
          lockedBy: session.user.id,
        },
      })
      await prisma.product.updateMany({
        where: { sellerId: id, status: "ACTIVE" },
        data: { status: "HIDDEN" },
      })
      await prisma.notification.create({
        data: {
          userId: id,
          type: "PRODUCT_REJECTED",
          title: "Cửa hàng bị tạm khoá",
          message: reason ? `Cửa hàng của bạn đã bị tạm khoá với lý do: ${reason}` : "Cửa hàng của bạn đã bị tạm khoá do vi phạm quy định. Vui lòng liên hệ admin để được hỗ trợ.",
          relatedType: "SELLER_STATUS",
        },
      })
      return NextResponse.json({ message: "Đã khoá cửa hàng" })
    }

    if (action === "UNLOCK") {
      if (!user.isLocked) {
        return NextResponse.json({ error: "Cửa hàng chưa bị khoá" }, { status: 400 })
      }
      await prisma.user.update({
        where: { id },
        data: {
          isLocked: false,
          lockedAt: null,
          lockedReason: null,
          lockedBy: null,
        },
      })
      await prisma.product.updateMany({
        where: { sellerId: id, status: "HIDDEN" },
        data: { status: "ACTIVE" },
      })
      await prisma.notification.create({
        data: {
          userId: id,
          type: "PRODUCT_APPROVED",
          title: "Cửa hàng đã được mở khoá",
          message: "Cửa hàng của bạn đã được mở khoá trở lại. Tất cả sản phẩm đã được hiển thị.",
          relatedType: "SELLER_STATUS",
        },
      })
      return NextResponse.json({ message: "Đã mở khoá cửa hàng" })
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/admin/sellers/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
