import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/messages/[id]/latest - Lấy message mới nhất (cho smart polling)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: session.user.id,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get only the latest message
    const latestMessage = await prisma.message.findFirst({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    })

    return NextResponse.json({ message: latestMessage })
  } catch (error) {
    console.error("GET /api/messages/[id]/latest error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
