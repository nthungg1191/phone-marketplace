import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const approveSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
})

// POST /api/admin/products/[id]/moderate - Duyệt hoặc từ chối sản phẩm
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, reason } = approveSchema.parse(body)

    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 404 })
    }

    if (product.status !== "PENDING") {
      return NextResponse.json({ error: "Sản phẩm không ở trạng thái chờ duyệt" }, { status: 400 })
    }

    const newStatus = action === "APPROVE" ? "ACTIVE" : "REJECTED"
    const notificationType = action === "APPROVE" ? "PRODUCT_APPROVED" : "PRODUCT_REJECTED"

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { status: newStatus },
      }),
      prisma.notification.create({
        data: {
          userId: product.sellerId,
          type: notificationType,
          title: action === "APPROVE" ? "Sản phẩm được duyệt" : "Sản phẩm bị từ chối",
          message: action === "APPROVE"
            ? `Sản phẩm "${product.title}" đã được duyệt và hiển thị công khai.`
            : `Sản phẩm "${product.title}" đã bị từ chối. ${reason ? `Lý do: ${reason}` : ""}`,
          data: JSON.stringify({ productId: id }),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ", details: error.issues }, { status: 400 })
    }
    console.error("POST /api/admin/products/[id]/moderate error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
