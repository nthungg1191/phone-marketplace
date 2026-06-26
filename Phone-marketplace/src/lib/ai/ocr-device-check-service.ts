import { z } from "zod"
import { VertexAIService } from "@/lib/ai/vertex-ai"

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

export type HealthCheckResult = z.infer<typeof healthCheckSchema>

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

const VALID_STATUS_VALUES = ["PASS", "FAIL", "NOT_TESTED"]

function normalizeEnum(value: unknown, validValues: string[]): string {
  if (typeof value !== "string") return "NOT_TESTED"
  const normalized = value.trim().toUpperCase()
  if (
    normalized === "NOT_TESTED" ||
    normalized === "NOT TESTED" ||
    normalized === "N/A" ||
    normalized === "NA"
  ) {
    return "NOT_TESTED"
  }
  return validValues.includes(normalized) ? normalized : "NOT_TESTED"
}

export class OcrDeviceCheckService {
  static async analyzeDeviceReport(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<HealthCheckResult> {
    const ai = VertexAIService.getInstance()
    const model = process.env.VERTEX_AI_MODEL || "gemini-2.5-flash"

    let responseText: string

    try {
      const result = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user" as const,
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBuffer.toString("base64"),
                },
              } as never,
            ],
          },
          {
            role: "user" as const,
            parts: [
              {
                text: "Extract all available information from this device check report in JSON format.",
              },
            ],
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
      console.error("[OcrDeviceCheckService] Vertex AI error:", errMsg)

      if (
        errMsg.includes("UNAUTHENTICATED") ||
        errMsg.includes("credential") ||
        errMsg.includes("login required")
      ) {
        throw new Error(
          "ADC chưa sẵn sàng. Hãy chạy `gcloud auth application-default login` hoặc kiểm tra service account."
        )
      }
      if (errMsg.includes("PERMISSION_DENIED")) {
        throw new Error("Tài khoản ADC không có quyền dùng Vertex AI.")
      }
      if (errMsg.includes("quota")) {
        throw new Error("Đã hết quota Vertex AI. Vui lòng thử lại sau.")
      }
      if (
        errMsg.includes("404") ||
        errMsg.includes("not found") ||
        errMsg.includes("model")
      ) {
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
      console.error(
        "[OcrDeviceCheckService] Parse error, raw response:",
        responseText.slice(0, 300)
      )
      throw new Error(
        "Không thể đọc kết quả từ AI. Vui lòng thử lại với ảnh rõ hơn."
      )
    }

    // Normalize enum values for components
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = parsedData
    const normalizedData = {
      ...raw,
      screen: normalizeEnum(raw.screen, VALID_STATUS_VALUES),
      cameraFront: normalizeEnum(raw.cameraFront, VALID_STATUS_VALUES),
      cameraBack: normalizeEnum(raw.cameraBack, VALID_STATUS_VALUES),
      speaker: normalizeEnum(raw.speaker, VALID_STATUS_VALUES),
      microphone: normalizeEnum(raw.microphone, VALID_STATUS_VALUES),
      wifi: normalizeEnum(raw.wifi, VALID_STATUS_VALUES),
      bluetooth: normalizeEnum(raw.bluetooth, VALID_STATUS_VALUES),
      fingerprint: normalizeEnum(raw.fingerprint, VALID_STATUS_VALUES),
      faceId: normalizeEnum(raw.faceId, VALID_STATUS_VALUES),
      chargingPort: normalizeEnum(raw.chargingPort, VALID_STATUS_VALUES),
      batteryHealth:
        typeof raw.batteryHealth === "number" ? raw.batteryHealth : 100,
    }

    const validation = healthCheckSchema.safeParse(normalizedData)
    if (!validation.success) {
      console.error(
        "[OcrDeviceCheckService] Validation error:",
        validation.error
      )
      throw new Error(
        "Dữ liệu không hợp lệ. Vui lòng thử lại với ảnh rõ hơn."
      )
    }

    return validation.data
  }
}