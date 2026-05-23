import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/users/[id] - Lấy thông tin user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
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
        lockedAt: true,
        lockedReason: true,
        sellerStatus: true,
        sellerRank: true,
        createdAt: true,
        emailVerifiedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] - Cập nhật user (lock/unlock, change role)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, reason } = body

    // Không cho phép admin tự thay đổi quyền của chính mình
    if (id === session.user.id) {
      return NextResponse.json({ error: "Không thể thay đổi quyền của chính bạn" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true, isVerified: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    switch (action) {
      case "LOCK":
        // Khóa tài khoản với lý do
        if (!reason) {
          return NextResponse.json({ error: "Vui lòng nhập lý do khóa tài khoản" }, { status: 400 })
        }
        await prisma.user.update({
          where: { id },
          data: {
            isLocked: true,
            lockedAt: new Date(),
            lockedReason: reason,
            lockedBy: session.user.id,
          },
        })
        return NextResponse.json({ success: true, message: "Đã khóa tài khoản" })

      case "UNLOCK":
        // Mở khóa tài khoản - xóa thông tin khóa
        await prisma.user.update({
          where: { id },
          data: {
            isLocked: false,
            lockedAt: null,
            lockedReason: null,
            lockedBy: null,
          },
        })
        return NextResponse.json({ success: true, message: "Đã mở khóa tài khoản" })

      case "CHANGE_ROLE":
        if (!["BUYER", "SELLER", "ADMIN"].includes(body.role)) {
          return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 })
        }
        await prisma.user.update({
          where: { id },
          data: { role: body.role },
        })
        return NextResponse.json({ success: true, message: "Đã cập nhật quyền" })

      case "TOGGLE_VERIFY":
        await prisma.user.update({
          where: { id },
          data: { isVerified: !user.isVerified },
        })
        return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái xác thực" })

      default:
        return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 })
    }
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] - Xóa user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params

    // Không cho phép admin xóa chính mình
    if (id === session.user.id) {
      return NextResponse.json({ error: "Không thể xóa chính bạn" }, { status: 400 })
    }

    // Không cho phép xóa admin khác
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true, isVerified: true },
    })

    if (user?.role === "ADMIN") {
      return NextResponse.json({ error: "Không thể xóa admin khác" }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Đã xóa user" })
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
