import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/lib/auth"

const createBrandSchema = z.object({
  name: z.string().min(1, "Tên thương hiệu không được trống").max(100),
  logo: z.string().optional(),
})

// GET /api/brands - Lấy danh sách thương hiệu
export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({ brands })
  } catch (error) {
    console.error("GET /api/brands error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/brands - Tạo thương hiệu mới (Admin only)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const body = await request.json()
    const data = createBrandSchema.parse(body)

    // Tạo slug từ name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    // Kiểm tra trùng tên
    const existing = await prisma.brand.findFirst({
      where: { OR: [{ name: data.name }, { slug }] },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Tên thương hiệu đã tồn tại" },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: { name: data.name, logo: data.logo, slug },
    })

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("POST /api/brands error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
