import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAnomalies } from "@/lib/analytics"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const url = new URL(request.url)
    const threshold = Math.max(
      1.5,
      Math.min(20, Number(url.searchParams.get("threshold") ?? "3"))
    )

    const anomalies = await getAnomalies(threshold)
    return NextResponse.json({ anomalies, threshold })
  } catch (error) {
    console.error("GET /api/admin/analytics/anomalies error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}