import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const sellerRequestSchema = z.object({
  phone: z.string().min(10, "Số điện thoại không hợp lệ").max(20),
  address: z.string().min(10, "Địa chỉ quá ngắn").max(500).optional(),
  idCardNumber: z.string().min(9, "Số CCCD không hợp lệ").max(12, "Số CCCD không hợp lệ"),
  idCardName: z.string().min(2, "Họ tên trên CCCD không được để trống").max(100),
  idCardFrontUrl: z.string().url("Ảnh mặt trước CCCD không hợp lệ"),
  idCardBackUrl: z.string().url("Ảnh mặt sau CCCD không hợp lệ"),
})

// GET /api/seller/request - Lấy trạng thái seller request
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        sellerStatus: true,
        sellerRequestAt: true,
        sellerApprovedAt: true,
        sellerRejectedReason: true,
        idCardNumber: true,
        idCardName: true,
        idCardFrontUrl: true,
        idCardBackUrl: true,
        sellerStats: {
          select: {
            avgRating: true,
            totalTransactions: true,
            successRate: true,
            isIdentityVerified: true,
          },
        },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/seller/request error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/seller/request - Gửi yêu cầu trở thành seller
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, sellerStatus: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    if (user.sellerStatus !== "NONE" && user.sellerStatus !== "REJECTED") {
      return NextResponse.json(
        { error: `Bạn không thể gửi yêu cầu (trạng thái hiện tại: ${user.sellerStatus})` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = sellerRequestSchema.parse(body)

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        sellerStatus: "PENDING",
        sellerRequestAt: new Date(),
        sellerRejectedReason: null,
        phone: data.phone || undefined,
        idCardNumber: data.idCardNumber,
        idCardName: data.idCardName,
        idCardFrontUrl: data.idCardFrontUrl,
        idCardBackUrl: data.idCardBackUrl,
      },
    })

    return NextResponse.json({ message: "Yêu cầu đã được gửi, vui lòng chờ admin duyệt" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/seller/request error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/seller/request - Admin duyệt/từ chối seller
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    // Kiểm tra quyền admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action, reason } = body

    if (!userId || !action) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { sellerStatus: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    if (targetUser.sellerStatus !== "PENDING") {
      return NextResponse.json({ error: "User không trong trạng thái chờ duyệt" }, { status: 400 })
    }

    if (action === "approve") {
      // Duyệt seller
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: "SELLER",
          sellerStatus: "APPROVED",
          sellerApprovedAt: new Date(),
        },
      })

      // Tạo SellerStats cho user mới
      await prisma.sellerStats.create({
        data: {
          userId: userId,
        },
      })

      // Tạo notification
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "PRODUCT_APPROVED",
          title: "Yêu cầu được duyệt!",
          message: "Chúc mừng! Yêu cầu trở thành người bán của bạn đã được duyệt. Bây giờ bạn có thể đăng bán sản phẩm.",
          relatedType: "SELLER_STATUS",
        },
      })

      return NextResponse.json({ message: "Đã duyệt seller thành công" })
    } else if (action === "reject") {
      // Từ chối seller
      await prisma.user.update({
        where: { id: userId },
        data: {
          sellerStatus: "REJECTED",
          sellerRejectedReason: reason || "Yêu cầu không được chấp nhận",
        },
      })

      // Tạo notification
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "PRODUCT_REJECTED",
          title: "Yêu cầu bị từ chối",
          message: reason || "Yêu cầu trở thành người bán của bạn không được chấp nhận.",
          relatedType: "SELLER_STATUS",
        },
      })

      return NextResponse.json({ message: "Đã từ chối seller" })
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (error) {
    console.error("PATCH /api/seller/request error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
