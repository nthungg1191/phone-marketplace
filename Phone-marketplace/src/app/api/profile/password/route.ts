import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mật khẩu hiện tại không được trống"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(1, "Xác nhận mật khẩu không được trống"),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const data = changePasswordSchema.parse(body)

    if (data.newPassword !== data.confirmPassword) {
      return NextResponse.json({ error: "Mật khẩu xác nhận không khớp" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 })
    }

    if (user.password) {
      const isValid = await bcrypt.compare(data.currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 12)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: "Đổi mật khẩu thành công" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/profile/password error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
