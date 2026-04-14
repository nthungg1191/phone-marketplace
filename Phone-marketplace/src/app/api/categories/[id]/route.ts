import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/lib/auth"

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
})

// GET /api/categories/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { orderBy: { name: "asc" } },
        _count: { select: { products: true } },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error("GET /api/categories/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/categories/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateCategorySchema.parse(body)

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        parentId: data.parentId === null ? null : data.parentId,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/categories/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const { id } = await params

    // Kiểm tra có sản phẩm không
    const productCount = await prisma.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      return NextResponse.json(
        { error: "Không thể xóa danh mục đã có sản phẩm" },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ message: "Đã xóa danh mục" })
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
