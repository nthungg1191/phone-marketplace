import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const [categories, brands] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ])

    return NextResponse.json({
      categories,
      brands,
    })
  } catch (error) {
    console.error("GET /api/admin/analytics/filters error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}