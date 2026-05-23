import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/addresses/[id]/default - Dat dia chi lam mac dinh
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.address.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Khong tim thay dia chi" }, { status: 404 })
    }

    // Bo mac dinh cac dia chi khac
    await prisma.address.updateMany({
      where: {
        userId: session.user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    })

    // Dat dia chi hien tai lam mac dinh
    const address = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error("POST /api/addresses/[id]/default error:", error)
    return NextResponse.json({ error: "Loi server" }, { status: 500 })
  }
}
