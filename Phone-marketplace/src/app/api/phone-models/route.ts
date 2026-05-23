import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/lib/auth"

const createPhoneModelSchema = z.object({
  brandId: z.string().min(1, "Brand ID không được trống"),
  name: z.string().min(1, "Tên model không được trống").max(100),
  releaseYear: z.number().optional(),
  defaultRam: z.array(z.number()).optional(),
  defaultStorage: z.array(z.number()).optional(),
  basePrice: z.number().optional(),
})

// GET /api/phone-models - Lấy danh sách models (filter theo brand nếu có)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get("brandId")

    const models = await prisma.phoneModel.findMany({
      where: {
        ...(brandId && { brandId }),
      },
      orderBy: [
        { releaseYear: "desc" },
        { name: "asc" },
      ],
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({ phoneModels: models })
  } catch (error) {
    console.error("GET /api/phone-models error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/phone-models - Tạo model mới (Admin only)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const body = await request.json()
    const data = createPhoneModelSchema.parse(body)

    // Tạo slug từ name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    // Kiểm tra trùng tên trong cùng brand
    const existing = await prisma.phoneModel.findFirst({
      where: { brandId: data.brandId, slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Model đã tồn tại trong thương hiệu này" },
        { status: 400 }
      )
    }

    const model = await prisma.phoneModel.create({
      data: {
        brandId: data.brandId,
        name: data.name,
        slug,
        releaseYear: data.releaseYear,
        defaultRam: data.defaultRam || [],
        defaultStorage: data.defaultStorage || [],
        basePrice: data.basePrice,
      },
    })

    return NextResponse.json({ phoneModel: model }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/phone-models error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
