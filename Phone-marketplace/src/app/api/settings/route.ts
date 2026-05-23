import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/settings - Lấy cài đặt người dùng
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        sellerStatus: true,
        sellerRank: true,
        isVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/settings error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/settings - Cập nhật cài đặt người dùng
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      phone,
      avatar,
      // Account settings
      emailNotifications,
      offerNotifications,
      orderNotifications,
      marketingEmails,
      // Privacy settings
      showProfile,
      showPhone,
      showEmail,
    } = body

    // Update basic profile
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (avatar !== undefined) updateData.avatar = avatar

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      })
    }

    return NextResponse.json({ message: "Cập nhật thành công" })
  } catch (error) {
    console.error("PATCH /api/settings error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
