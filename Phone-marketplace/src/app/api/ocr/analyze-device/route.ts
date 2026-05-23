import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"

// Valid health check status values
type HealthStatus = "PASS" | "FAIL" | "NOT_TESTED"

// Health check response schema - unified for iPhone & Android
const healthCheckSchema = z.object({
  // Device Info
  serialNumber: z.string().optional(),
  wifiMacAddress: z.string().optional(),
  bluetoothMacAddress: z.string().optional(),

  // OS Version
  iosVersion: z.string().optional(),
  androidVersion: z.string().optional(),

  // Software Check
  activationStatus: z.string().optional(),
  jailbreakStatus: z.string().optional(),
  securityLockStatus: z.string().optional(),

  // Battery
  batteryHealth: z.number().min(0).max(100),
  batteryCycleCount: z.number().optional(),

  // Components (PASS/FAIL)
  screen: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  cameraFront: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  cameraBack: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  speaker: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  microphone: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  wifi: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  bluetooth: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  fingerprint: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  faceId: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
  chargingPort: z.enum(["PASS", "FAIL", "NOT_TESTED"]),

  // Summary
  overallStatus: z.string().optional(),
  notes: z.string().optional(),
})

// System prompt for Gemini Vision - Unified Report (Vietnamese)
const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích báo cáo kiểm tra thiết bị di động (3uTools cho iPhone hoặc các tools khác cho Android).

Đây là ảnh chụp báo cáo kiểm tra thiết bị. Hãy trích xuất TẤT CẢ thông tin có sẵn từ ảnh.

QUAN TRỌNG: Trả về bằng TIẾNG VIỆT cho các trường mô tả.

Cấu trúc JSON đầu ra:
{
  "serialNumber": "ABC123XYZ",
  "wifiMacAddress": "AA:BB:CC:DD:EE:FF",
  "bluetoothMacAddress": "AA:BB:CC:DD:EE:FF",
  
  "iosVersion": "17.5",
  "androidVersion": "14",

  "activationStatus": "Activated / Inactive",
  "jailbreakStatus": "No Jailbreak / Jailbroken",
  "securityLockStatus": "Unlocked / Locked / iCloud Lock / FRP Lock",

  "batteryHealth": 92,
  "batteryCycleCount": 150,

  "screen": "PASS" | "FAIL" | "NOT_TESTED",
  "cameraFront": "PASS" | "FAIL" | "NOT_TESTED",
  "cameraBack": "PASS" | "FAIL" | "NOT_TESTED",
  "speaker": "PASS" | "FAIL" | "NOT_TESTED",
  "microphone": "PASS" | "FAIL" | "NOT_TESTED",
  "wifi": "PASS" | "FAIL" | "NOT_TESTED",
  "bluetooth": "PASS" | "FAIL" | "NOT_TESTED",
  "fingerprint": "PASS" | "FAIL" | "NOT_TESTED",
  "faceId": "PASS" | "FAIL" | "NOT_TESTED",
  "chargingPort": "PASS" | "FAIL" | "NOT_TESTED",

  "overallStatus": "Máy tốt / Máy trung bình / Có lỗi",
  "notes": "Các ghi chú bổ sung về tình trạng máy"
}

Quy tắc trích xuất cho components:
- "Pass", "Normal", "OK", "Connected", "True", "Support", "Đạt" → "PASS"
- "Fail", "Error", "Defective", "False", "Not Support", "Lỗi" → "FAIL"
- Nếu không rõ ràng, thiếu, "N/A", "Not Tested" → "NOT_TESTED"

Quy tắc trích xuất cho software:
- Battery % (VD: "92%") → batteryHealth (0-100)
- Serial patterns (chữ + số, 10-12 ký tự) → serialNumber
- MAC addresses (AA:BB:CC:DD:EE:FF) → wifiMacAddress hoặc bluetoothMacAddress
- iOS versions (VD: "17.5", "iOS 17.5.1") → iosVersion
- Android versions (VD: "14", "Android 14", "One UI 6") → androidVersion
- iCloud Lock, FRP, Google Lock → "securityLockStatus": "Locked"
- Jailbreak, Root → "jailbreakStatus": "Jailbroken / Rooted"
- "Activated", "Active", "Unactivated", "Inactive" → activationStatus

QUAN TRỌNG:
- Trích xuất càng nhiều thông tin càng tốt từ ảnh
- Nếu một trường không hiển thị trong ảnh, bỏ qua nó
- Chỉ trả về JSON hợp lệ, không markdown, không giải thích.`

// POST /api/ocr/analyze-device
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    // Check Gemini API configuration
    if (!process.env.GEMINI_API_KEY) {
      console.error("Gemini API not configured")
      return NextResponse.json(
        { error: "Dịch vụ AI chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào .env" },
        { status: 500 }
      )
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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Use Gemini 1.5 Flash for fast, cost-effective OCR
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
      systemInstruction: SYSTEM_PROMPT,
    })

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const mimeType = imageFile.type

    // Generate content with image
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      "Extract all available information from this device check report in JSON format.",
    ])

    const responseText = result.response.text()

    if (!responseText) {
      return NextResponse.json(
        { error: "Không thể phân tích hình ảnh. Vui lòng thử lại." },
        { status: 500 }
      )
    }

    // Parse JSON from response
    let parsedData
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }
      parsedData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText)
      return NextResponse.json(
        { error: "Không thể đọc kết quả từ AI. Vui lòng thử lại với ảnh rõ hơn." },
        { status: 500 }
      )
    }

    // Normalize enum values for components
    const normalizeEnum = (value: unknown, validValues: string[]): string => {
      if (typeof value !== "string") return "NOT_TESTED"
      const normalized = value.trim().toUpperCase()
      if (normalized === "NOT_TESTED" || normalized === "NOT TESTED" || normalized === "N/A" || normalized === "NA") {
        return "NOT_TESTED"
      }
      return validValues.includes(normalized) ? normalized : "NOT_TESTED"
    }

    const VALID_STATUS_VALUES = ["PASS", "FAIL", "NOT_TESTED"]

    const normalizedData = {
      ...parsedData,
      // Normalize all component enum fields
      screen: normalizeEnum(parsedData.screen, VALID_STATUS_VALUES),
      cameraFront: normalizeEnum(parsedData.cameraFront, VALID_STATUS_VALUES),
      cameraBack: normalizeEnum(parsedData.cameraBack, VALID_STATUS_VALUES),
      speaker: normalizeEnum(parsedData.speaker, VALID_STATUS_VALUES),
      microphone: normalizeEnum(parsedData.microphone, VALID_STATUS_VALUES),
      wifi: normalizeEnum(parsedData.wifi, VALID_STATUS_VALUES),
      bluetooth: normalizeEnum(parsedData.bluetooth, VALID_STATUS_VALUES),
      fingerprint: normalizeEnum(parsedData.fingerprint, VALID_STATUS_VALUES),
      faceId: normalizeEnum(parsedData.faceId, VALID_STATUS_VALUES),
      chargingPort: normalizeEnum(parsedData.chargingPort, VALID_STATUS_VALUES),
      // Default required fields
      batteryHealth: typeof parsedData.batteryHealth === "number" ? parsedData.batteryHealth : 100,
    }

    // Validate parsed data
    const validationResult = healthCheckSchema.safeParse(normalizedData)
    if (!validationResult.success) {
      console.error("Invalid health check data:", validationResult.error)
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ. Vui lòng thử lại với ảnh rõ hơn." },
        { status: 500 }
      )
    }

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
        return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 404 })
      }
      
      if (product.sellerId !== session.user.id) {
        return NextResponse.json({ error: "Bạn không có quyền cập nhật sản phẩm này" }, { status: 403 })
      }
      
      // Upsert health check (create or update)
      const healthCheck = await prisma.healthCheck.upsert({
        where: { productId },
        update: {
          serialNumber: validationResult.data.serialNumber,
          wifiMacAddress: validationResult.data.wifiMacAddress,
          bluetoothMacAddress: validationResult.data.bluetoothMacAddress,
          iosVersion: validationResult.data.iosVersion,
          androidVersion: validationResult.data.androidVersion,
          activationStatus: validationResult.data.activationStatus,
          jailbreakStatus: validationResult.data.jailbreakStatus,
          securityLockStatus: validationResult.data.securityLockStatus,
          batteryCycleCount: validationResult.data.batteryCycleCount,
          batteryHealth: validationResult.data.batteryHealth,
          screen: validationResult.data.screen as HealthStatus,
          cameraFront: validationResult.data.cameraFront as HealthStatus,
          cameraBack: validationResult.data.cameraBack as HealthStatus,
          speaker: validationResult.data.speaker as HealthStatus,
          microphone: validationResult.data.microphone as HealthStatus,
          wifi: validationResult.data.wifi as HealthStatus,
          bluetooth: validationResult.data.bluetooth as HealthStatus,
          fingerprint: validationResult.data.fingerprint as HealthStatus,
          faceId: validationResult.data.faceId as HealthStatus,
          chargingPort: validationResult.data.chargingPort as HealthStatus,
          overallStatus: validationResult.data.overallStatus,
          notes: validationResult.data.notes,
        },
        create: {
          productId,
          serialNumber: validationResult.data.serialNumber,
          wifiMacAddress: validationResult.data.wifiMacAddress,
          bluetoothMacAddress: validationResult.data.bluetoothMacAddress,
          iosVersion: validationResult.data.iosVersion,
          androidVersion: validationResult.data.androidVersion,
          activationStatus: validationResult.data.activationStatus,
          jailbreakStatus: validationResult.data.jailbreakStatus,
          securityLockStatus: validationResult.data.securityLockStatus,
          batteryCycleCount: validationResult.data.batteryCycleCount,
          batteryHealth: validationResult.data.batteryHealth,
          screen: validationResult.data.screen as HealthStatus,
          cameraFront: validationResult.data.cameraFront as HealthStatus,
          cameraBack: validationResult.data.cameraBack as HealthStatus,
          speaker: validationResult.data.speaker as HealthStatus,
          microphone: validationResult.data.microphone as HealthStatus,
          wifi: validationResult.data.wifi as HealthStatus,
          bluetooth: validationResult.data.bluetooth as HealthStatus,
          fingerprint: validationResult.data.fingerprint as HealthStatus,
          faceId: validationResult.data.faceId as HealthStatus,
          chargingPort: validationResult.data.chargingPort as HealthStatus,
          overallStatus: validationResult.data.overallStatus,
          notes: validationResult.data.notes,
        },
      })

      // Also update product's batteryHealth field
      await prisma.product.update({
        where: { id: productId },
        data: { batteryHealth: validationResult.data.batteryHealth },
      })

      return NextResponse.json({
        success: true,
        data: validationResult.data,
        healthCheck,
        saved: true,
      })
    }

    // No productId, just return the analyzed data
    return NextResponse.json({
      success: true,
      data: validationResult.data,
      saved: false,
    })
  } catch (error) {
    console.error("OCR analyze error:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Bạn đã sử dụng quá nhiều lần. Vui lòng thử lại sau." },
          { status: 429 }
        )
      }
      if (error.message.includes("403") || error.message.includes("PERMISSION_DENIED")) {
        return NextResponse.json(
          { error: "API Key không hợp lệ. Vui lòng kiểm tra GEMINI_API_KEY." },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    )
  }
}
