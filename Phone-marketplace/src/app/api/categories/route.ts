import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/lib/auth"

const createCategorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được trống").max(100),
  icon: z.string().optional(),
  parentId: z.string().optional(),
})

// GET /api/categories - Lấy danh sách danh mục
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: {
        children: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("GET /api/categories error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/categories - Tạo danh mục mới (Admin only)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const body = await request.json()
    const data = createCategorySchema.parse(body)

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    // Kiểm tra trùng tên ở cùng cấp
    const existing = await prisma.category.findFirst({
      where: { name: data.name, parentId: data.parentId || null },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Tên danh mục đã tồn tại ở cấp này" },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: { name: data.name, icon: data.icon, parentId: data.parentId, slug },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("POST /api/categories error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
