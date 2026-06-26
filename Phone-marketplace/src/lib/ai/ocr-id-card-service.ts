import { GoogleGenAI } from "@google/genai"
import { z } from "zod"

const SYSTEM_PROMPT = `Bạn là chuyên gia đọc CCCD/CMND Việt Nam.

Tôi sẽ gửi tối đa 2 ảnh: ảnh mặt trước và ảnh mặt sau của CCCD/CMND Việt Nam.

Hãy trích xuất thông tin và trả về JSON với cấu trúc:

{
  "front": {
    "idCardNumber": "012345678901" hoặc null nếu không đọc được,
    "idCardName": "NGUYEN VAN A" (IN HOA, bỏ dấu tiếng Việt nếu ảnh không rõ),
    "dateOfBirth": "DD/MM/YYYY" hoặc null,
    "placeOfOrigin": "Tỉnh/Thành phố" hoặc null,
    "gender": "Nam" hoặc "Nữ" hoặc null,
    "nationality": "Việt Nam" hoặc null,
    "expiryDate": "DD/MM/YYYY" hoặc null (thường ở dưới ảnh mặt trước)
  },
  "back": {
    "issueDate": "DD/MM/YYYY" hoặc null,
    "issuePlace": "Tỉnh/Thành phố cấp" hoặc null,
    "mrzCode": "dòng MRZ 30 ký tự" hoặc null
  },
  "confidence": {
    "overall": 0.0-1.0,
    "idCardNumber": 0.0-1.0,
    "idCardName": 0.0-1.0,
    "dateOfBirth": 0.0-1.0,
    "placeOfOrigin": 0.0-1.0,
    "gender": 0.0-1.0,
    "nationality": 0.0-1.0,
    "expiryDate": 0.0-1.0,
    "issueDate": 0.0-1.0,
    "issuePlace": 0.0-1.0
  },
  "warnings": ["Mô tả các cảnh báo nếu có, ví dụ: 'Ảnh mờ ở vùng số CCCD'", '...']
}

QUY TẮC QUAN TRỌNG:

1. Số CCCD/CMND:
   - CCCD mới: 12 chữ số (format: XXXXXXXXXXXX)
   - CMND cũ: 9 chữ số (format: XXXXXXXXX)
   - -> Chỉ lấy các chữ số, bỏ hết ký tự khác

2. Họ tên:
   - Chuyển về IN HOA
   - Bỏ dấu tiếng Việt nếu ảnh không rõ
   - Giữ đúng thứ tự: Họ + Đệm + Tên

3. Ngày sinh:
   - Format: DD/MM/YYYY
   - Tìm trong vùng "Ngày sinh" hoặc "DOB"

4. Độ tin cậy (confidence):
   - 0.9-1.0: Ảnh rõ nét, đọc chắc chắn
   - 0.7-0.89: Ảnh khá rõ, đọc được
   - 0.5-0.69: Ảnh mờ nhẹ hoặc bị che một phần
   - 0.3-0.49: Ảnh mờ, phải đoán dựa trên pattern
   - < 0.3: Ảnh rất mờ/không đọc được, trả về null

5. Nếu ảnh không hợp lệ (không phải CCCD VN, ảnh trắng, ảnh lỗi):
   - Trả về confidence = 0 cho tất cả các trường
   - Thêm warning: "Không nhận diện được CCCD"

6. Nếu chỉ có 1 ảnh (mặt trước hoặc mặt sau):
   - Trả null cho các trường không có dữ liệu
   - Không báo lỗi

TRẢ VỀ: Chỉ trả về JSON hợp lệ, không markdown, không giải thích.`

const responseSchema = z.object({
  front: z.object({
    idCardNumber: z.string().nullable(),
    idCardName: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    placeOfOrigin: z.string().nullable(),
    gender: z.string().nullable(),
    nationality: z.string().nullable(),
    expiryDate: z.string().nullable(),
  }),
  back: z.object({
    issueDate: z.string().nullable(),
    issuePlace: z.string().nullable(),
    mrzCode: z.string().nullable(),
  }),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    idCardNumber: z.number().min(0).max(1),
    idCardName: z.number().min(0).max(1),
    dateOfBirth: z.number().min(0).max(1),
    placeOfOrigin: z.number().min(0).max(1),
    gender: z.number().min(0).max(1),
    nationality: z.number().min(0).max(1),
    expiryDate: z.number().min(0).max(1),
    issueDate: z.number().min(0).max(1),
    issuePlace: z.number().min(0).max(1),
  }),
  warnings: z.array(z.string()),
})

export type OcrIdCardResult = z.infer<typeof responseSchema>

function getVertexAIClient(): GoogleGenAI {
  const projectId = process.env.VERTEX_AI_PROJECT_ID
  const location = process.env.VERTEX_AI_LOCATION || "asia-southeast1"

  if (!projectId) {
    throw new Error("VERTEX_AI_PROJECT_ID is not set")
  }

  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (credJson?.trim()) {
    const credData = JSON.parse(credJson)
    credData.private_key = credData.private_key
      .replace(/\\n/g, "\n")
      .replace(/\n-----BEGIN/, "\n-----BEGIN")
      .replace(/-----END[^\n]+\n$/, (m) => m.trim())

    return new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location,
      googleAuthOptions: {
        credentials: credData,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })
  }

  return new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
  })
}

export class OcrIdCardService {
  private static getModelName(): string {
    return process.env.VERTEX_AI_MODEL || "gemini-2.0-flash-exp"
  }

  static async analyzeIdCard(
    frontImageBuffer: Buffer | null,
    frontMimeType: string,
    backImageBuffer: Buffer | null,
    backMimeType: string
  ): Promise<OcrIdCardResult> {
    const ai = getVertexAIClient()
    const model = this.getModelName()

    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = []
    const labels: string[] = []

    if (frontImageBuffer) {
      imageParts.push({
        inlineData: {
          mimeType: frontMimeType,
          data: frontImageBuffer.toString("base64"),
        },
      })
      labels.push("Mặt trước CCCD")
    }

    if (backImageBuffer) {
      imageParts.push({
        inlineData: {
          mimeType: backMimeType,
          data: backImageBuffer.toString("base64"),
        },
      })
      labels.push("Mặt sau CCCD")
    }

    const labelText = labels.join(" và ")
    const promptText = `Đây là ảnh: ${labelText}. Hãy trích xuất thông tin và trả về JSON.`

    let responseText: string

    try {
      const result = await ai.models.generateContent({
        model,
        contents: [
          ...imageParts.map((img) => ({
            role: "user" as const,
            parts: [{ inlineData: img.inlineData }] as never,
          })),
          {
            role: "user" as const,
            parts: [{ text: promptText }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidate = result.candidates?.[0] as any
      responseText = candidate?.content?.parts?.[0]?.text

      if (!responseText) {
        throw new Error("AI không phản hồi")
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error("[OcrIdCardService] Vertex AI error:", errMsg)

      if (errMsg.includes("UNAUTHENTICATED") || errMsg.includes("credential") || errMsg.includes("login required")) {
        throw new Error("ADC chưa sẵn sàng. Hãy chạy `gcloud auth application-default login` hoặc kiểm tra service account.")
      }
      if (errMsg.includes("PERMISSION_DENIED")) {
        throw new Error("Tài khoản ADC không có quyền dùng Vertex AI.")
      }
      if (errMsg.includes("quota")) {
        throw new Error("Đã hết quota Vertex AI. Vui lòng thử lại sau.")
      }
      if (errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("model")) {
        throw new Error(`Model Vertex AI "${model}" không tồn tại.`)
      }

      throw new Error(`Lỗi AI: ${errMsg}`)
    }

    let parsedData: unknown
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Không tìm thấy JSON trong phản hồi")
      parsedData = JSON.parse(jsonMatch[0])
    } catch {
      console.error("[OcrIdCardService] Parse error, raw response:", responseText.slice(0, 300))
      throw new Error("Không thể đọc kết quả từ AI. Vui lòng thử lại với ảnh rõ hơn.")
    }

    const validation = responseSchema.safeParse(parsedData)
    if (!validation.success) {
      console.error("[OcrIdCardService] Validation error:", validation.error)
      throw new Error("Dữ liệu CCCD không hợp lệ. Vui lòng thử lại với ảnh rõ hơn.")
    }

    return validation.data
  }
}
