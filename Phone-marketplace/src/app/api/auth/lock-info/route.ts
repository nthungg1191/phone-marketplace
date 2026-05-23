import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/auth/lock-info?email=xxx - Lấy thông tin khóa của user (public, không cần auth)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        isLocked: true,
        lockedReason: true,
        lockedAt: true,
        lockedBy: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      isLocked: user.isLocked,
      lockedReason: user.lockedReason,
      lockedAt: user.lockedAt?.toISOString() || null,
      lockedBy: user.lockedBy,
    })
  } catch (error) {
    console.error("GET /api/auth/lock-info error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
