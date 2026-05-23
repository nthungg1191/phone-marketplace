import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateProductSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().max(5000).optional(),
  condition: z.enum(["LIKE_NEW", "PERFECT_99", "EXCELLENT_98", "EXCELLENT_97", "GOOD"]).optional(),
  ramGb: z.number().min(1).optional(),
  storageGb: z.number().min(8).optional(),
  color: z.string().min(1).optional(),
  batteryHealth: z.number().min(0).max(100).optional(),
  price: z.number().min(10000).optional(),
  negotiable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "HIDDEN", "SOLD"]).optional(),
  images: z.array(z.string()).optional(),
  healthCheck: z.object({
    screen: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    cameraFront: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    cameraBack: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    speaker: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    microphone: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    buttons: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    faceId: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    fingerprint: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    wifi: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    bluetooth: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    chargingPort: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    notes: z.string().optional(),
  }).optional(),
})

// PATCH /api/products/[id] - Cập nhật sản phẩm
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateProductSchema.parse(body)

    // Check product exists and ownership
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    if (product.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa" }, { status: 403 })
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        condition: data.condition,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        color: data.color,
        batteryHealth: data.batteryHealth,
        price: data.price,
        negotiable: data.negotiable,
        status: data.status,
      },
      include: {
        brand: true,
        model: true,
        category: true,
        images: true,
        healthCheck: true,
      },
    })

    // Update images if provided
    if (data.images) {
      await prisma.productImage.deleteMany({ where: { productId: id } })
      await prisma.productImage.createMany({
        data: data.images.map((url, index) => ({
          productId: id,
          url,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      })
    }

    // Update health check if provided
    if (data.healthCheck) {
      await prisma.healthCheck.upsert({
        where: { productId: id },
        create: {
          productId: id,
          batteryHealth: updatedProduct.batteryHealth,
          ...data.healthCheck,
        },
        update: data.healthCheck,
      })
    }

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Xóa sản phẩm
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    // Check product exists and ownership
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    if (product.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền xóa" }, { status: 403 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ message: "Đã xóa sản phẩm" })
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
