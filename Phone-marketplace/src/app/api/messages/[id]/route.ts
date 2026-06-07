import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/messages/[id] - Lấy tin nhắn của cuộc trò chuyện
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id: conversationId } = await params
    const currentUserId = session.user.id

    if (!conversationId) {
      return NextResponse.json({ error: "Thiếu conversation ID" }, { status: 400 })
    }

    // Kiểm tra user có trong cuộc trò chuyện không
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        participants: {
          some: { userId: currentUserId, leftAt: null },
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
        product: {
          select: { id: true, title: true, images: { where: { isPrimary: true }, take: 1 } },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện" }, { status: 404 })
    }

    // Lấy tin nhắn
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: currentUserId },
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return NextResponse.json({
      conversation,
      messages,
    })
  } catch (error) {
    console.error("GET /api/messages/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/messages/[id] - Gửi tin nhắn
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id: conversationId } = await params
    const currentUserId = session.user.id

    if (!conversationId) {
      return NextResponse.json({ error: "Thiếu conversation ID" }, { status: 400 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Tin nhắn không được để trống" }, { status: 400 })
    }

    // Kiểm tra conversation tồn tại và user có trong cuộc trò chuyện
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        participants: {
          some: { userId: currentUserId, leftAt: null },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện" }, { status: 404 })
    }

    // Kiểm tra xem có participant nào đã rời không (người kia đã rời)
    const allParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
    })

    const otherParticipantLeft = allParticipants.some(
      (p) => p.userId !== currentUserId && p.leftAt !== null
    )

    // Nếu người kia đã rời, tạo cuộc trò chuyện mới
    if (otherParticipantLeft) {
      const otherParticipant = allParticipants.find(
        (p) => p.userId !== currentUserId
      )

      if (!otherParticipant) {
        return NextResponse.json({ error: "Không tìm thấy người tham gia" }, { status: 404 })
      }

      // Tạo cuộc trò chuyện mới với cùng người tham gia
      const newConversation = await prisma.conversation.create({
        data: {
          productId: conversation.productId,
          participants: {
            create: [
              { userId: currentUserId },
              { userId: otherParticipant.userId },
            ],
          },
          messages: {
            create: {
              senderId: currentUserId,
              content: content.trim(),
              type: "TEXT",
            },
          },
          lastMessageAt: new Date(),
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
          messages: {
            include: {
              sender: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      })

      return NextResponse.json({
        message: newConversation.messages[0],
        conversationId: newConversation.id,
        isNewConversation: true,
      }, { status: 201 })
    }

    // Người kia chưa rời - gửi tin nhắn bình thường vào cuộc trò chuyện hiện tại
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        content: content.trim(),
        type: "TEXT",
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error("POST /api/messages/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/messages/[id] - Rời khỏi cuộc trò chuyện (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id: conversationId } = await params
    const currentUserId = session.user.id

    if (!conversationId) {
      return NextResponse.json({ error: "Thiếu conversation ID" }, { status: 400 })
    }

    // Kiểm tra user có trong cuộc trò chuyện không
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUserId,
        leftAt: null,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện" }, { status: 404 })
    }

    // Soft delete - đánh dấu người dùng đã rời khỏi cuộc trò chuyện
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    })

    // Kiểm tra xem có participant nào khác chưa rời không
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: currentUserId },
      },
    })

    const allOthersLeft = otherParticipants.every((p) => p.leftAt !== null)

    // Nếu tất cả người khác đều đã rời, đánh dấu conversation là deleted
    if (allOthersLeft) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { deletedAt: new Date() },
      })
    }

    return NextResponse.json({ message: "Đã rời khỏi cuộc trò chuyện" })
  } catch (error) {
    console.error("DELETE /api/messages/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
