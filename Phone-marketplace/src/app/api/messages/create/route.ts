import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createConversationSchema = z.object({
  participantId: z.string().min(1, "Thiếu participantId"),
  productId: z.string().optional(),
  initialMessage: z.string().min(1).max(1000).optional(),
})

// POST /api/messages - Tạo hoặc lấy cuộc trò chuyện
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const currentUserId = session.user.id

    const body = await request.json()
    const { participantId, productId, initialMessage } = createConversationSchema.parse(body)

    if (!participantId || participantId.trim() === "") {
      return NextResponse.json({ error: "participantId không hợp lệ" }, { status: 400 })
    }

    if (participantId === currentUserId) {
      return NextResponse.json({ error: "Không thể nhắn tin với chính mình" }, { status: 400 })
    }

    // Verify both users exist in database
    const [currentUser, participant] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUserId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: participantId }, select: { id: true } }),
    ])

    if (!currentUser) {
      return NextResponse.json({ error: "Tài khoản không hợp lệ" }, { status: 400 })
    }

    if (!participant) {
      return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 })
    }

    // Check if conversation already exists (với cùng productId hoặc không có productId)
    // Chỉ tìm cuộc trò chuyện chưa bị xóa và user chưa rời
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        deletedAt: null,
        AND: [
          { participants: { some: { userId: currentUserId, leftAt: null } } },
          { participants: { some: { userId: participantId, leftAt: null } } },
          // Nếu có productId thì check theo productId, nếu không thì check conversations không có product
          productId
            ? { OR: [{ productId }, { productId: null }] }
            : { productId: null },
        ],
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    // Nếu có tin nhắn ban đầu và conversation tồn tại
    if (existingConversation && initialMessage) {
      // Thêm tin nhắn vào cuộc trò chuyện đã có
      const message = await prisma.message.create({
        data: {
          conversationId: existingConversation.id,
          senderId: currentUserId,
          content: initialMessage,
          type: "TEXT",
        },
      })

      // Update lastMessageAt
      await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { lastMessageAt: new Date() },
      })

      return NextResponse.json({
        conversationId: existingConversation.id,
        conversation: { ...existingConversation, messages: [message] },
        message: "Đã gửi tin nhắn vào cuộc trò chuyện hiện có",
      })
    }

    // Nếu conversation tồn tại nhưng không có tin nhắn
    if (existingConversation) {
      return NextResponse.json({
        conversationId: existingConversation.id,
        conversation: existingConversation,
        message: "Cuộc trò chuyện đã tồn tại",
      })
    }

    // Tạo cuộc trò chuyện mới
    const conversation = await prisma.conversation.create({
      data: {
        productId,
        participants: {
          create: [
            { userId: currentUserId },
            { userId: participantId },
          ],
        },
        messages: initialMessage
          ? {
              create: {
                senderId: currentUserId,
                content: initialMessage,
                type: "TEXT",
              },
            }
          : undefined,
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        messages: true,
      },
    })

    // Update lastMessageAt
    if (initialMessage) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/messages error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
