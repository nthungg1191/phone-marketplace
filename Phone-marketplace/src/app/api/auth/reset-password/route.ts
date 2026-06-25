import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const hashPassword = (password: string) => bcrypt.hash(password, 10)

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng." },
        { status: 400 }
      )
    }

    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      return NextResponse.json(
        { error: "Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới." },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
      select: { id: true, password: true },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Tài khoản không hợp lệ." },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(password)

    // Update user password and delete the reset token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ])

    return NextResponse.json({
      message: "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập ngay bây giờ.",
    })
  } catch (error) {
    console.error("[Reset Password] Error:", error)
    return NextResponse.json(
      { error: "Đã xảy ra lỗi. Vui lòng thử lại." },
      { status: 500 }
    )
  }
}
