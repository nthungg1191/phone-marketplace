import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createProductSchema = z.object({
  brandId: z.string().min(1, "Vui lòng chọn thương hiệu"),
  modelId: z.string().min(1, "Vui lòng chọn mẫu điện thoại"),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục").optional().or(z.literal("")),
  title: z.string().min(10, "Tiêu đề phải có ít nhất 10 ký tự").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  condition: z.enum(["LIKE_NEW", "PERFECT_99", "EXCELLENT_98", "EXCELLENT_97", "GOOD"]),
  ramGb: z.number().min(1, "RAM phải lớn hơn 0"),
  storageGb: z.number().min(8, "Bộ nhớ phải lớn hơn 8GB"),
  color: z.string().min(1, "Vui lòng chọn màu sắc"),
  imei: z.string().optional().or(z.literal("")),
  batteryHealth: z.number().min(0).max(100),
  price: z.number().min(10000, "Giá phải lớn hơn 10,000đ"),
  negotiable: z.boolean().default(true),
  images: z.array(z.string()).min(1, "Vui lòng thêm ít nhất 1 hình ảnh"),
  healthCheck: z.object({
    serialNumber: z.string().optional(),
    wifiMacAddress: z.string().optional(),
    bluetoothMacAddress: z.string().optional(),
    iosVersion: z.string().optional(),
    androidVersion: z.string().optional(),
    activationStatus: z.string().optional(),
    jailbreakStatus: z.string().optional(),
    securityLockStatus: z.string().optional(),
    batteryCycleCount: z.number().optional(),
    batteryHealth: z.number(),
    screen: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    cameraFront: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    cameraBack: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    speaker: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    microphone: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    wifi: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    bluetooth: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    fingerprint: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    faceId: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    chargingPort: z.enum(["PASS", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    overallStatus: z.string().optional(),
    notes: z.string().optional().or(z.literal("")),
  }).optional(),
})

// POST /api/products/new - Tạo sản phẩm mới
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    // Check if user is approved seller
    if (session.user.role !== "SELLER" || session.user.sellerStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Bạn cần là người bán được duyệt để đăng sản phẩm" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createProductSchema.parse(body)

    // Generate unique slug
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)

    const slug = `${baseSlug}-${Date.now()}`

    // Get or create default category if not provided
    let categoryId = data.categoryId
    if (!categoryId) {
      const defaultCategory = await prisma.category.findFirst({
        where: { slug: "smartphone" },
      })
      if (defaultCategory) {
        categoryId = defaultCategory.id
      } else {
        const firstCategory = await prisma.category.findFirst()
        categoryId = firstCategory?.id || ""
      }
    }

    // Create product with images and health check
    const product = await prisma.product.create({
      data: {
        sellerId: session.user.id,
        brandId: data.brandId,
        modelId: data.modelId,
        categoryId: categoryId,
        title: data.title,
        slug,
        description: data.description || null,
        condition: data.condition,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        color: data.color,
        imei: data.imei || null,
        batteryHealth: data.batteryHealth,
        price: data.price,
        negotiable: data.negotiable,
        status: "PENDING", // New products need admin approval
        images: {
          create: data.images.map((url, index) => ({
            url,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        },
        healthCheck: data.healthCheck
          ? {
              create: {
                serialNumber: data.healthCheck.serialNumber || null,
                wifiMacAddress: data.healthCheck.wifiMacAddress || null,
                bluetoothMacAddress: data.healthCheck.bluetoothMacAddress || null,
                iosVersion: data.healthCheck.iosVersion || null,
                androidVersion: data.healthCheck.androidVersion || null,
                activationStatus: data.healthCheck.activationStatus || null,
                jailbreakStatus: data.healthCheck.jailbreakStatus || null,
                securityLockStatus: data.healthCheck.securityLockStatus || null,
                batteryCycleCount: data.healthCheck.batteryCycleCount || null,
                batteryHealth: data.batteryHealth,
                screen: data.healthCheck.screen,
                cameraFront: data.healthCheck.cameraFront,
                cameraBack: data.healthCheck.cameraBack,
                speaker: data.healthCheck.speaker,
                microphone: data.healthCheck.microphone,
                wifi: data.healthCheck.wifi,
                bluetooth: data.healthCheck.bluetooth,
                fingerprint: data.healthCheck.fingerprint,
                faceId: data.healthCheck.faceId,
                chargingPort: data.healthCheck.chargingPort,
                overallStatus: data.healthCheck.overallStatus || null,
                notes: data.healthCheck.notes || null,
              },
            }
          : undefined,
      },
      include: {
        brand: true,
        model: true,
        category: true,
        images: true,
        healthCheck: true,
      },
    })

    // Create notification for admin
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "ORDER_CREATED",
          title: "Sản phẩm mới cần duyệt",
          message: `Người bán ${session.user.name} vừa đăng sản phẩm mới: "${data.title}"`,
          relatedId: product.id,
          relatedType: "PRODUCT",
        },
      })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/products/new error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
