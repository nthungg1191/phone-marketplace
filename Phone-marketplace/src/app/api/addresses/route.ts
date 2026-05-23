import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createAddressSchema = z.object({
  fullName: z.string().min(2, "Ho ten phai it nhat 2 ky tu").max(100),
  phone: z.string().min(10, "So dien thoai phai 10 so").max(10).regex(/^0[0-9]{9}$/, "So dien thoai khong hop le"),
  street: z.string().min(5, "Dia chi phai it nhat 5 ky tu").max(255),
  provinceCode: z.string().min(1, "Chon tinh/thanh pho"),
  provinceName: z.string().min(1, "Chon tinh/thanh pho"),
  wardCode: z.string().min(1, "Chon phuong/xa"),
  wardName: z.string().min(1, "Chon phuong/xa"),
  district: z.string().optional().default(""),
  city: z.string().optional().default(""),
  isDefault: z.boolean().optional().default(false),
})

// GET /api/addresses - Lay danh sach dia chi cua user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("GET /api/addresses error:", error)
    return NextResponse.json({ error: "Loi server" }, { status: 500 })
  }
}

// POST /api/addresses - Tao dia chi moi
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createAddressSchema.safeParse(body)

    if (!parsed.success) {
      const issues = (parsed.error as { issues?: Array<{ path: string[]; message: string }> }).issues
      return NextResponse.json({
        error: "Du lieu khong hop le",
        details: issues?.map(i => ({ field: i.path.join("."), message: i.message })),
      }, { status: 400 })
    }

    const data = parsed.data

    // Neu la dia chi mac dinh, bo mac dinh cac dia chi khac
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    } else {
      // Neu la dia chi dau tien, tu dong dat mac dinh
      const existingCount = await prisma.address.count({
        where: { userId: session.user.id },
      })
      if (existingCount === 0) {
        data.isDefault = true
      }
    }

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        fullName: data.fullName,
        phone: data.phone,
        street: data.street,
        provinceCode: data.provinceCode,
        provinceName: data.provinceName,
        wardCode: data.wardCode,
        wardName: data.wardName,
        district: data.district || "",
        city: data.city || "",
        isDefault: data.isDefault,
      },
    })

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    console.error("POST /api/addresses error:", error)
    return NextResponse.json({ error: "Loi server" }, { status: 500 })
  }
}
