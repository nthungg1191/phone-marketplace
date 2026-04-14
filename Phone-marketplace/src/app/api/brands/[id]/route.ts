import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/lib/auth"

const updateBrandSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/brands/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        models: true,
        _count: { select: { products: true } },
      },
    })

    if (!brand) {
      return NextResponse.json({ error: "Không tìm thấy thương hiệu" }, { status: 404 })
    }

    return NextResponse.json({ brand })
  } catch (error) {
    console.error("GET /api/brands/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/brands/[id]
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
    const data = updateBrandSchema.parse(body)

    const brand = await prisma.brand.update({
      where: { id },
      data,
    })

    return NextResponse.json({ brand })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/brands/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/brands/[id]
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

    // Kiểm tra có sản phẩm nào không
    const productCount = await prisma.product.count({ where: { brandId: id } })
    if (productCount > 0) {
      // Soft delete - chỉ ẩn thương hiệu
      await prisma.brand.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ message: "Đã ẩn thương hiệu (có sản phẩm liên kết)" })
    }

    await prisma.brand.delete({ where: { id } })
    return NextResponse.json({ message: "Đã xóa thương hiệu" })
  } catch (error) {
    console.error("DELETE /api/brands/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
