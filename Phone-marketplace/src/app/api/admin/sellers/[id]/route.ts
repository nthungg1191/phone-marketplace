import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
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
        sellerStatus: true,
        sellerRequestAt: true,
        sellerApprovedAt: true,
        sellerRejectedReason: true,
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
          },
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

// PATCH /api/admin/sellers/[id] - Duyệt/từ chối seller
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
      select: { sellerStatus: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    if (user.sellerStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Yêu cầu này đã được xử lý" },
        { status: 400 }
      )
    }

    if (action === "APPROVE") {
      // Cập nhật user thành seller
      await prisma.user.update({
        where: { id },
        data: {
          role: "SELLER",
          sellerStatus: "APPROVED",
          sellerApprovedAt: new Date(),
        },
      })

      // Tạo SellerStats cho user mới
      await prisma.sellerStats.create({
        data: {
          userId: id,
        },
      })

      // Tạo notification cho user
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
    } else {
      // Từ chối seller
      await prisma.user.update({
        where: { id },
        data: {
          sellerStatus: "REJECTED",
          sellerRejectedReason: reason || "Yêu cầu không được chấp nhận",
        },
      })

      // Tạo notification cho user
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/admin/sellers/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
