import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createProductSchema = z.object({
  brandId: z.string().min(1, "Vui lòng chọn thương hiệu"),
  modelId: z.string().min(1, "Vui lòng chọn mẫu điện thoại"),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  title: z.string().min(10, "Tiêu đề phải có ít nhất 10 ký tự").max(200),
  description: z.string().max(5000).optional(),
  condition: z.enum(["LIKE_NEW", "PERFECT_99", "EXCELLENT_98", "EXCELLENT_97", "GOOD"]),
  ramGb: z.number().min(1, "RAM phải lớn hơn 0"),
  storageGb: z.number().min(8, "Bộ nhớ phải lớn hơn 8GB"),
  color: z.string().min(1, "Vui lòng chọn màu sắc"),
  imei: z.string().optional(),
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
    screen: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    cameraFront: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    cameraBack: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    speaker: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    microphone: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    wifi: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    bluetooth: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    fingerprint: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    faceId: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    chargingPort: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    overallStatus: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
})

// Partial update schema — used by handleStatusChange (seller/products page)
// All fields are optional so a simple { status: "HIDDEN" } payload is valid.
const partialUpdateSchema = z.object({
  brandId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  title: z.string().min(10).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  condition: z.enum(["LIKE_NEW", "PERFECT_99", "EXCELLENT_98", "EXCELLENT_97", "GOOD"]).optional(),
  ramGb: z.number().min(1).optional(),
  storageGb: z.number().min(8).optional(),
  color: z.string().min(1).optional(),
  imei: z.string().optional().nullable(),
  batteryHealth: z.number().min(0).max(100).optional(),
  price: z.number().min(10000).optional(),
  negotiable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "HIDDEN", "SOLD"]).optional(),
  images: z.array(z.string()).optional(),
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
    screen: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    cameraFront: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    cameraBack: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    speaker: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    microphone: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    wifi: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    bluetooth: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    fingerprint: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    faceId: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    chargingPort: z.enum(["PASS", "FAIL", "NOT_TESTED"]).optional(),
    overallStatus: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
})

// GET /api/products/[id] - Chi tiết sản phẩm
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log(`[Product API] Looking for product with id/slug: ${id}`)

    // Try to find by slug first, then by ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        brand: true,
        model: true,
        category: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        healthCheck: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            sellerRank: true,
            sellerStats: true,
            createdAt: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: { select: { reviews: true } },
      },
    })

    if (!product) {
      console.log(`[Product API] Product not found for: ${id}`)
      // Try to find by slug to provide better error message
      const bySlug = await prisma.product.findUnique({ where: { slug: id } })
      const byId = await prisma.product.findUnique({ where: { id } })

      if (bySlug) {
        return NextResponse.json({ error: "Sản phẩm hiện không khả dụng", status: bySlug.status }, { status: 404 })
      }
      if (byId) {
        return NextResponse.json({ error: "Sản phẩm hiện không khả dụng", status: byId.status }, { status: 404 })
      }

      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    console.log(`[Product API] Found product: ${product.title} (status: ${product.status})`)

    // Check if user can edit (owner or admin)
    const session = await auth()
    const isOwner = session?.user?.id === product.sellerId
    const isAdmin = session?.user?.role === "ADMIN"
    const canEdit = isOwner || isAdmin

    // View count is incremented by the client after a short dwell delay
    // (see POST /api/products/[id]/view). Incrementing here would cause a
    // double count on every page load.

    return NextResponse.json({ product, canEdit })
  } catch (error) {
    console.error("GET /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// POST /api/products/[id] - Tạo sản phẩm mới
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

    // Create product with images and health check
    const product = await prisma.product.create({
      data: {
        sellerId: session.user.id,
        brandId: data.brandId,
        modelId: data.modelId,
        categoryId: data.categoryId,
        title: data.title,
        slug,
        description: data.description,
        condition: data.condition,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        color: data.color,
        imei: data.imei,
        batteryHealth: data.batteryHealth,
        price: data.price,
        negotiable: data.negotiable,
        status: "ACTIVE",
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
                screen: data.healthCheck.screen || "NOT_TESTED",
                cameraFront: data.healthCheck.cameraFront || "NOT_TESTED",
                cameraBack: data.healthCheck.cameraBack || "NOT_TESTED",
                speaker: data.healthCheck.speaker || "NOT_TESTED",
                microphone: data.healthCheck.microphone || "NOT_TESTED",
                wifi: data.healthCheck.wifi || "NOT_TESTED",
                bluetooth: data.healthCheck.bluetooth || "NOT_TESTED",
                fingerprint: data.healthCheck.fingerprint || "NOT_TESTED",
                faceId: data.healthCheck.faceId || "NOT_TESTED",
                chargingPort: data.healthCheck.chargingPort || "NOT_TESTED",
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

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("POST /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PUT /api/products/[id] - Cập nhật sản phẩm
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    // Get product and check ownership
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    // Check if user is owner or admin
    if (existingProduct.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền sửa sản phẩm này" }, { status: 403 })
    }

    const body = await request.json()
    const data = createProductSchema.parse(body)

    // Update product with images and health check
    const product = await prisma.product.update({
      where: { id },
      data: {
        brandId: data.brandId,
        modelId: data.modelId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description || null,
        condition: data.condition,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        color: data.color,
        imei: data.imei || null,
        batteryHealth: data.batteryHealth,
        price: data.price,
        negotiable: data.negotiable,
        // Reset to PENDING if being edited by owner (needs re-approval)
        status: session.user.role === "ADMIN" ? undefined : "PENDING",
        images: {
          deleteMany: {},
          create: data.images.map((url, index) => ({
            url,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        },
        healthCheck: data.healthCheck
          ? {
              upsert: {
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
                  screen: data.healthCheck.screen || "NOT_TESTED",
                  cameraFront: data.healthCheck.cameraFront || "NOT_TESTED",
                  cameraBack: data.healthCheck.cameraBack || "NOT_TESTED",
                  speaker: data.healthCheck.speaker || "NOT_TESTED",
                  microphone: data.healthCheck.microphone || "NOT_TESTED",
                  wifi: data.healthCheck.wifi || "NOT_TESTED",
                  bluetooth: data.healthCheck.bluetooth || "NOT_TESTED",
                  fingerprint: data.healthCheck.fingerprint || "NOT_TESTED",
                  faceId: data.healthCheck.faceId || "NOT_TESTED",
                  chargingPort: data.healthCheck.chargingPort || "NOT_TESTED",
                  overallStatus: data.healthCheck.overallStatus || null,
                  notes: data.healthCheck.notes || null,
                },
                update: {
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
                  screen: data.healthCheck.screen || "NOT_TESTED",
                  cameraFront: data.healthCheck.cameraFront || "NOT_TESTED",
                  cameraBack: data.healthCheck.cameraBack || "NOT_TESTED",
                  speaker: data.healthCheck.speaker || "NOT_TESTED",
                  microphone: data.healthCheck.microphone || "NOT_TESTED",
                  wifi: data.healthCheck.wifi || "NOT_TESTED",
                  bluetooth: data.healthCheck.bluetooth || "NOT_TESTED",
                  fingerprint: data.healthCheck.fingerprint || "NOT_TESTED",
                  faceId: data.healthCheck.faceId || "NOT_TESTED",
                  chargingPort: data.healthCheck.chargingPort || "NOT_TESTED",
                  overallStatus: data.healthCheck.overallStatus || null,
                  notes: data.healthCheck.notes || null,
                },
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

    // Notify admin if status changed to PENDING
    if (session.user.role !== "ADMIN") {
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      })

      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: "ORDER_UPDATED",
            title: "Sản phẩm được cập nhật cần duyệt lại",
            message: `Sản phẩm "${data.title}" đã được chỉnh sửa và cần được duyệt lại.`,
            relatedId: product.id,
            relatedType: "PRODUCT",
          },
        })
      }
    }

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PUT /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// PATCH /api/products/[id] - Cập nhật từng trường sản phẩm
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    // Get product and check ownership
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    if (existingProduct.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa sản phẩm này" }, { status: 403 })
    }

    const body = await request.json()
    const data = partialUpdateSchema.parse(body)

    // Build update payload — only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.condition !== undefined) updateData.condition = data.condition
    if (data.ramGb !== undefined) updateData.ramGb = data.ramGb
    if (data.storageGb !== undefined) updateData.storageGb = data.storageGb
    if (data.color !== undefined) updateData.color = data.color
    if (data.batteryHealth !== undefined) updateData.batteryHealth = data.batteryHealth
    if (data.price !== undefined) updateData.price = data.price
    if (data.negotiable !== undefined) updateData.negotiable = data.negotiable

    // status: admin can change directly, owner changing to HIDDEN is fine
    // owner changing from HIDDEN back to ACTIVE or any other status → needs re-approval
    if (data.status !== undefined) {
      updateData.status =
        session.user.role === "ADMIN" ? data.status : data.status === "ACTIVE" ? "ACTIVE" : data.status
    }

    // Replace images if provided
    if (data.images !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: id } })
      if (data.images.length > 0) {
        await prisma.productImage.createMany({
          data: data.images.map((url, index) => ({
            productId: id,
            url,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        })
      }
    }

    // Upsert healthCheck if provided
    if (data.healthCheck !== undefined) {
      await prisma.healthCheck.upsert({
        where: { productId: id },
        create: {
          productId: id,
          batteryHealth: data.healthCheck.batteryHealth ?? 100,
          serialNumber: data.healthCheck.serialNumber ?? null,
          wifiMacAddress: data.healthCheck.wifiMacAddress ?? null,
          bluetoothMacAddress: data.healthCheck.bluetoothMacAddress ?? null,
          iosVersion: data.healthCheck.iosVersion ?? null,
          androidVersion: data.healthCheck.androidVersion ?? null,
          activationStatus: data.healthCheck.activationStatus ?? null,
          jailbreakStatus: data.healthCheck.jailbreakStatus ?? null,
          securityLockStatus: data.healthCheck.securityLockStatus ?? null,
          batteryCycleCount: data.healthCheck.batteryCycleCount ?? null,
          screen: data.healthCheck.screen ?? "NOT_TESTED",
          cameraFront: data.healthCheck.cameraFront ?? "NOT_TESTED",
          cameraBack: data.healthCheck.cameraBack ?? "NOT_TESTED",
          speaker: data.healthCheck.speaker ?? "NOT_TESTED",
          microphone: data.healthCheck.microphone ?? "NOT_TESTED",
          wifi: data.healthCheck.wifi ?? "NOT_TESTED",
          bluetooth: data.healthCheck.bluetooth ?? "NOT_TESTED",
          fingerprint: data.healthCheck.fingerprint ?? "NOT_TESTED",
          faceId: data.healthCheck.faceId ?? "NOT_TESTED",
          chargingPort: data.healthCheck.chargingPort ?? "NOT_TESTED",
          overallStatus: data.healthCheck.overallStatus ?? null,
          notes: data.healthCheck.notes ?? null,
        },
        update: {
          batteryHealth: data.healthCheck.batteryHealth ?? 100,
          serialNumber: data.healthCheck.serialNumber ?? null,
          wifiMacAddress: data.healthCheck.wifiMacAddress ?? null,
          bluetoothMacAddress: data.healthCheck.bluetoothMacAddress ?? null,
          iosVersion: data.healthCheck.iosVersion ?? null,
          androidVersion: data.healthCheck.androidVersion ?? null,
          activationStatus: data.healthCheck.activationStatus ?? null,
          jailbreakStatus: data.healthCheck.jailbreakStatus ?? null,
          securityLockStatus: data.healthCheck.securityLockStatus ?? null,
          batteryCycleCount: data.healthCheck.batteryCycleCount ?? null,
          screen: data.healthCheck.screen ?? "NOT_TESTED",
          cameraFront: data.healthCheck.cameraFront ?? "NOT_TESTED",
          cameraBack: data.healthCheck.cameraBack ?? "NOT_TESTED",
          speaker: data.healthCheck.speaker ?? "NOT_TESTED",
          microphone: data.healthCheck.microphone ?? "NOT_TESTED",
          wifi: data.healthCheck.wifi ?? "NOT_TESTED",
          bluetooth: data.healthCheck.bluetooth ?? "NOT_TESTED",
          fingerprint: data.healthCheck.fingerprint ?? "NOT_TESTED",
          faceId: data.healthCheck.faceId ?? "NOT_TESTED",
          chargingPort: data.healthCheck.chargingPort ?? "NOT_TESTED",
          overallStatus: data.healthCheck.overallStatus ?? null,
          notes: data.healthCheck.notes ?? null,
        },
      })
    }

    // Perform product update (only scalar fields)
    const product = Object.keys(updateData).length > 0
      ? await prisma.product.update({
          where: { id },
          data: updateData,
          include: { brand: true, model: true, category: true, images: true, healthCheck: true },
        })
      : await prisma.product.findUnique({
          where: { id },
          include: { brand: true, model: true, category: true, images: true, healthCheck: true },
        })

    // Notify admin if non-admin edited (status reset to PENDING)
    if (session.user.role !== "ADMIN" && (data.title || data.price || data.status)) {
      const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })
      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: "ORDER_UPDATED",
            title: "Sản phẩm được cập nhật cần duyệt lại",
            message: `Sản phẩm "${product?.title}" đã được chỉnh sửa và cần được duyệt lại.`,
            relatedId: id,
            relatedType: "PRODUCT",
          },
        })
      }
    }

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("PATCH /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Xóa sản phẩm
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { id } = await params

    // Get product and check ownership
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    // Check if user is owner or admin
    if (existingProduct.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền xóa sản phẩm này" }, { status: 403 })
    }

    // Delete product (cascade will delete images and healthCheck)
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Xóa sản phẩm thành công" })
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
