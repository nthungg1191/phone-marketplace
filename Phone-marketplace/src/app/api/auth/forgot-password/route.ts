import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail, generateResetToken } from "@/lib/email"

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
})

const RESET_TOKEN_EXPIRY_MINUTES = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    console.log(`[Forgot Password] Checking user: ${normalizedEmail}`)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true },
    })

    console.log(`[Forgot Password] User found:`, user ? `id=${user.id}, hasPassword=${!!user.password}` : "null")

    // Always return success to prevent email enumeration attacks
    // but only send email if user exists
    if (!user || !user.password) {
      console.log(`[Forgot Password] Skipping email send (user=${!!user}, hasPassword=${!!user?.password})`)
      return NextResponse.json(
        { message: "Nếu tài khoản tồn tại với email này, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu." },
        { status: 200 }
      )
    }

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    })

    // Generate a short, URL-safe token
    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000)
    console.log(`[Forgot Password] Generated token: ${token}`)

    // Store the token in DB
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expires: expiresAt,
      },
    })

    console.log(`[Forgot Password] Calling sendPasswordResetEmail...`)
    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, token)
    console.log(`[Forgot Password] Email result:`, emailResult)

    if (!emailResult.success) {
      console.error("[Forgot Password] Email send failed:", emailResult.error)
      return NextResponse.json(
        { error: "Không thể gửi email. Vui lòng thử lại sau." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.",
    })
  } catch (error) {
    console.error("[Forgot Password] Error:", error)
    return NextResponse.json(
      { error: "Đã xảy ra lỗi. Vui lòng thử lại." },
      { status: 500 }
    )
  }
}
