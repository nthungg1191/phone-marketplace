import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTimeseries, type DateRange } from "@/lib/analytics"

function parseRange(url: URL): DateRange {
  const now = new Date()
  const defaultTo = now
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fromParam = url.searchParams.get("from")
  const toParam = url.searchParams.get("to")
  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : defaultTo
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return { from: defaultFrom, to: defaultTo }
  }
  return { from, to }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
    }
    if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const url = new URL(request.url)
    const range = parseRange(url)
    const points = await getTimeseries(range, { sellerId: session.user.id })

    return NextResponse.json({ points, range })
  } catch (error) {
    console.error("GET /api/seller/analytics/timeseries error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}