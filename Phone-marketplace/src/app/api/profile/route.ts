import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
  phone: z.string()
    .regex(/^0[0-9]{9}$/, "Số điện thoại phải là 10 số và bắt đầu bằng số 0")
    .optional()
    .or(z.literal("")),
  avatar: z.string().url().optional().or(z.literal("")),
})

// GET /api/profile - Lấy thông tin profile
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        sellerStatus: true,
        sellerRank: true,
        sellerApprovedAt: true,
        isLocked: true,
        lockedReason: true,
        lockedAt: true,
        sellerStats: {
          select: {
            avgRating: true,
            totalTransactions: true,
            successRate: true,
            isIdentityVerified: true,
          },
        },
        _count: {
          select: {
            ordersAsBuyer: true,
            ordersAsSeller: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/profile error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/profile - Cập nhật thông tin
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        phone: data.phone || null,
        avatar: data.avatar || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
      },
    })

    return NextResponse.json({ user, message: "Cập nhật thành công" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/profile error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
