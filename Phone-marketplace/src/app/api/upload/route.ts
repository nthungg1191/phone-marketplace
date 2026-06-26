import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_FOLDERS = ["avatars", "id-cards", "products"]

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folderParam = (formData.get("folder") as string) || "avatars"
    const folder = ALLOWED_FOLDERS.includes(folderParam) ? folderParam : "avatars"

    if (!file) {
      return NextResponse.json({ error: "Không có file" }, { status: 400 })
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)" }, { status: 400 })
    }

    // CCCD cần ảnh rõ nét hơn — 5MB
    const maxSize = folder === "id-cards" ? 5 * 1024 * 1024 : 2 * 1024 * 1024
    if (file.size > maxSize) {
      const limitMB = folder === "id-cards" ? 5 : 2
      return NextResponse.json(
        { error: `Kích thước file không được vượt quá ${limitMB}MB` },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    const transformations =
      folder === "avatars"
        ? [
            { width: 400, height: 400, crop: "fill", gravity: "face" as const },
            { quality: "auto", fetch_format: "auto" as const },
          ]
        : [
            { width: 1200, height: 800, crop: "limit" as const },
            { quality: "auto:best", fetch_format: "auto" as const },
          ]

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      transformation: transformations,
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Lỗi khi tải ảnh lên" }, { status: 500 })
  }
}
