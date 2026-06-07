import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const VIETNAM_PHONE_REGEX = /^(0[1-9][0-9]{8}|0[1-9][0-9]{7})$/
const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .regex(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/, "Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z
    .string()
    .refine(
      (val) => !val || VIETNAM_PHONE_REGEX.test(val),
      { message: "Số điện thoại không hợp lệ (VD: 0912345678)" }
    )
    .optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email đã được sử dụng" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        role: "BUYER",
        sellerStatus: "NONE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json(
      { message: "Đăng ký thành công", user },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Đã xảy ra lỗi server" },
      { status: 500 }
    )
  }
}