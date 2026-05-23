import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// DELETE /api/wishlist/[productId] - Xóa khỏi yêu thích
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { productId } = await params

    const item = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm trong danh sách yêu thích" }, { status: 404 })
    }

    await prisma.wishlist.delete({
      where: { id: item.id },
    })

    return NextResponse.json({ message: "Đã xóa khỏi danh sách yêu thích" })
  } catch (error) {
    console.error("DELETE /api/wishlist/[productId] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
