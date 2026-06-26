import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { OcrIdCardService } from "@/lib/ai/ocr-id-card-service"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const formData = await request.formData()
    const frontFile = formData.get("front") as File | null
    const backFile = formData.get("back") as File | null

    if (!frontFile && !backFile) {
      return NextResponse.json(
        { error: "Vui lòng upload ít nhất 1 ảnh CCCD" },
        { status: 400 }
      )
    }

    let frontBuffer: Buffer | null = null
    let frontMimeType = "image/jpeg"
    let backBuffer: Buffer | null = null
    let backMimeType = "image/jpeg"

    if (frontFile) {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
      if (!allowedTypes.includes(frontFile.type)) {
        return NextResponse.json(
          { error: "Mặt trước: chỉ chấp nhận PNG, JPG, WEBP" },
          { status: 400 }
        )
      }
      if (frontFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Mặt trước: ảnh vượt quá 5MB" },
          { status: 400 }
        )
      }
      frontBuffer = Buffer.from(await frontFile.arrayBuffer())
      frontMimeType = frontFile.type
    }

    if (backFile) {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
      if (!allowedTypes.includes(backFile.type)) {
        return NextResponse.json(
          { error: "Mặt sau: chỉ chấp nhận PNG, JPG, WEBP" },
          { status: 400 }
        )
      }
      if (backFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Mặt sau: ảnh vượt quá 5MB" },
          { status: 400 }
        )
      }
      backBuffer = Buffer.from(await backFile.arrayBuffer())
      backMimeType = backFile.type
    }

    const result = await OcrIdCardService.analyzeIdCard(
      frontBuffer,
      frontMimeType,
      backBuffer,
      backMimeType
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[OCR analyze-id-card]", error)
    const msg = error instanceof Error ? error.message : "Có lỗi xảy ra"

    if (msg.includes("ADC") || msg.includes("quyền") || msg.includes("login")) {
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    if (msg.includes("quota")) {
      return NextResponse.json({ error: msg }, { status: 429 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
