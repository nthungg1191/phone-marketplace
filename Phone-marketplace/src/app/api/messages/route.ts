import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/messages - Danh sách cuộc trò chuyện
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const conversations = await prisma.conversation.findMany({
      where: {
        deletedAt: null,
        participants: {
          some: { userId: session.user.id, leftAt: null },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        product : {
          select: { id: true, title: true, images: { where: { isPrimary: true }, take: 1 } },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("GET /api/messages error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
