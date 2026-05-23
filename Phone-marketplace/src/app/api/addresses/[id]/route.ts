import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateAddressSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(10).regex(/^0[0-9]{9}$/).optional().or(z.literal("")),
  street: z.string().min(5).max(255).optional(),
  provinceCode: z.string().min(1).optional(),
  provinceName: z.string().min(1).optional(),
  wardCode: z.string().min(1).optional(),
  wardName: z.string().min(1).optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  isDefault: z.boolean().optional(),
})

// GET /api/addresses/[id] - Lay chi tiet dia chi
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 })
    }

    const { id } = await params

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!address) {
      return NextResponse.json({ error: "Khong tim thay dia chi" }, { status: 404 })
    }

    return NextResponse.json({ address })
  } catch (error) {
    console.error("GET /api/addresses/[id] error:", error)
    return NextResponse.json({ error: "Loi server" }, { status: 500 })
  }
}

// PATCH /api/addresses/[id] - Cap nhat dia chi
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateAddressSchema.safeParse(body)

    if (!parsed.success) {
      const issues = (parsed.error as { issues?: Array<{ path: string[]; message: string }> }).issues
      return NextResponse.json({
        error: "Du lieu khong hop le",
        details: issues?.map(i => ({ field: i.path.join("."), message: i.message })),
      }, { status: 400 })
    }

    const existing = await prisma.address.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Khong tim thay dia chi" }, { status: 404 })
    }

    const data = parsed.data

    // Neu dat mac dinh, bo mac dinh cac dia chi khac
    if (data.isDefault === true) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      })
    }

    const updateData: Record<string, unknown> = {}
    if (data.fullName !== undefined) updateData.fullName = data.fullName
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.street !== undefined) updateData.street = data.street
    if (data.provinceCode !== undefined) updateData.provinceCode = data.provinceCode
    if (data.provinceName !== undefined) updateData.provinceName = data.provinceName
    if (data.wardCode !== undefined) updateData.wardCode = data.wardCode
    if (data.wardName !== undefined) updateData.wardName = data.wardName
    if (data.district !== undefined) updateData.district = data.district
    if (data.city !== undefined) updateData.city = data.city
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    const address = await prisma.address.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error("PATCH /api/addresses/[id] error:", error)
    return NextResponse.json({ error: "Loi server" }, { status: 500 })
  }
}

// DELETE /api/addresses/[id] - Xoa dia chi
export async function DELETE(
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

    await prisma.address.delete({ where: { id } })

    // Neu dia chi vua xoa la mac dinh, dat dia chi moi nhat lam mac dinh
    if (existing.isDefault) {
      const latest = await prisma.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      })
      if (latest) {
        await prisma.address.update({
          where: { id: latest.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/addresses/[id] error:", error)
    return NextResponse.json({ error: "Loi server" }, { status: 500 })
  }
}
