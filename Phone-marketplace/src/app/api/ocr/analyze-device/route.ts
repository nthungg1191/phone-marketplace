import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OcrDeviceCheckService } from "@/lib/ai/ocr-device-check-service"

type HealthStatus = "PASS" | "FAIL" | "NOT_TESTED"

// POST /api/ocr/analyze-device
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null

    if (!imageFile) {
      return NextResponse.json(
        { error: "Vui lòng upload hình ảnh" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file PNG, JPG, hoặc WEBP" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ảnh quá lớn. Vui lòng sử dụng ảnh < 10MB" },
        { status: 400 }
      )
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    const mimeType = imageFile.type

    // Call OCR service
    const validated = await OcrDeviceCheckService.analyzeDeviceReport(
      imageBuffer,
      mimeType
    )

    // Get productId from form data if provided (for saving with product)
    const productId = formData.get("productId") as string | null

    // If productId provided, save health check to database
    if (productId) {
      // Verify product ownership
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { sellerId: true },
      })

      if (!product) {
        return NextResponse.json(
          { error: "Sản phẩm không tồn tại" },
          { status: 404 }
        )
      }

      if (product.sellerId !== session.user.id) {
        return NextResponse.json(
          { error: "Bạn không có quyền cập nhật sản phẩm này" },
          { status: 403 }
        )
      }

      // Upsert health check (create or update)
      const healthCheck = await prisma.healthCheck.upsert({
        where: { productId },
        update: {
          serialNumber: validated.serialNumber,
          wifiMacAddress: validated.wifiMacAddress,
          bluetoothMacAddress: validated.bluetoothMacAddress,
          iosVersion: validated.iosVersion,
          androidVersion: validated.androidVersion,
          activationStatus: validated.activationStatus,
          jailbreakStatus: validated.jailbreakStatus,
          securityLockStatus: validated.securityLockStatus,
          batteryCycleCount: validated.batteryCycleCount,
          batteryHealth: validated.batteryHealth,
          screen: validated.screen as HealthStatus,
          cameraFront: validated.cameraFront as HealthStatus,
          cameraBack: validated.cameraBack as HealthStatus,
          speaker: validated.speaker as HealthStatus,
          microphone: validated.microphone as HealthStatus,
          wifi: validated.wifi as HealthStatus,
          bluetooth: validated.bluetooth as HealthStatus,
          fingerprint: validated.fingerprint as HealthStatus,
          faceId: validated.faceId as HealthStatus,
          chargingPort: validated.chargingPort as HealthStatus,
          overallStatus: validated.overallStatus,
          notes: validated.notes,
        },
        create: {
          productId,
          serialNumber: validated.serialNumber,
          wifiMacAddress: validated.wifiMacAddress,
          bluetoothMacAddress: validated.bluetoothMacAddress,
          iosVersion: validated.iosVersion,
          androidVersion: validated.androidVersion,
          activationStatus: validated.activationStatus,
          jailbreakStatus: validated.jailbreakStatus,
          securityLockStatus: validated.securityLockStatus,
          batteryCycleCount: validated.batteryCycleCount,
          batteryHealth: validated.batteryHealth,
          screen: validated.screen as HealthStatus,
          cameraFront: validated.cameraFront as HealthStatus,
          cameraBack: validated.cameraBack as HealthStatus,
          speaker: validated.speaker as HealthStatus,
          microphone: validated.microphone as HealthStatus,
          wifi: validated.wifi as HealthStatus,
          bluetooth: validated.bluetooth as HealthStatus,
          fingerprint: validated.fingerprint as HealthStatus,
          faceId: validated.faceId as HealthStatus,
          chargingPort: validated.chargingPort as HealthStatus,
          overallStatus: validated.overallStatus,
          notes: validated.notes,
        },
      })

      // Also update product's batteryHealth field
      await prisma.product.update({
        where: { id: productId },
        data: { batteryHealth: validated.batteryHealth },
      })

      return NextResponse.json({
        success: true,
        data: validated,
        healthCheck,
        saved: true,
      })
    }

    // No productId, just return the analyzed data
    return NextResponse.json({
      success: true,
      data: validated,
      saved: false,
    })
  } catch (error) {
    console.error("OCR analyze error:", error)
    const msg = error instanceof Error ? error.message : "Có lỗi xảy ra"

    if (msg.includes("ADC") || msg.includes("quyền") || msg.includes("login")) {
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    if (msg.includes("quota")) {
      return NextResponse.json({ error: msg }, { status: 429 })
    }
    if (msg.includes("Model")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}