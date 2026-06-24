import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const VIEWED_COOKIE = "viewed_products"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 // 24h
const MAX_TRACKED_IDS = 200 // bound the cookie size

// Per-IP rate limit on the view endpoint
const IP_LIMIT = 60 // hits
const IP_WINDOW_MS = 60 * 1000 // 1 minute
// Per-(ip+product) rate limit
const PER_PRODUCT_LIMIT = 5
const PER_PRODUCT_WINDOW_MS = 60 * 1000 // 1 minute

function readViewedIds(cookieValue: string | undefined): Set<string> {
  if (!cookieValue) return new Set()
  return new Set(
    cookieValue
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  )
}

function serializeViewedIds(ids: Set<string>): string {
  // Most-recent first, capped to avoid runaway cookie size
  const arr = Array.from(ids).slice(0, MAX_TRACKED_IDS)
  return arr.join(",")
}

function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  return NextResponse.json(
    { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  )
}

// POST /api/products/[id]/view - Increment view count
// Called from the client after a dwell delay (3-5s) so accidental page
// loads / bounces do not pollute the count.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // --- Rate limit by IP (cheap guard) ---
    const ip = getClientIp(request.headers)
    const ipLimit = checkRateLimit(`view:ip:${ip}`, {
      limit: IP_LIMIT,
      windowMs: IP_WINDOW_MS,
    })
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetAt)

    // --- Rate limit by (IP, product) to prevent hammering a single product ---
    const productLimit = checkRateLimit(`view:ip:product:${ip}:${id}`, {
      limit: PER_PRODUCT_LIMIT,
      windowMs: PER_PRODUCT_WINDOW_MS,
    })
    if (!productLimit.allowed) {
      // Silently no-op for per-product spam: return 200 so the client
      // does not log a noisy error, but do NOT increment the counter.
      return NextResponse.json({ success: true, deduped: true })
    }

    // --- Dedup by cookie (server-readable, harder to bypass than sessionStorage) ---
    const cookieStore = await cookies()
    const cookie = cookieStore.get(VIEWED_COOKIE)
    const viewed = readViewedIds(cookie?.value)
    if (viewed.has(id)) {
      return NextResponse.json({ success: true, deduped: true })
    }

    // --- Avoid inflating the owner's own counter ---
    const session = await auth()
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, sellerId: true, status: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    }

    if (product.status !== "ACTIVE") {
      return NextResponse.json({ success: true, deduped: true })
    }

    const isOwner = session?.user?.id === product.sellerId
    if (isOwner) {
      return NextResponse.json({ success: true, deduped: true })
    }

    // --- Increment atomically and persist cookie ---
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    })

    viewed.add(id)
    cookieStore.set(VIEWED_COOKIE, serializeViewedIds(viewed), {
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      // Not HttpOnly: the client mirror in sessionStorage is fine, and we
      // want the value available for read-back if needed. The data is just
      // product ids, not sensitive.
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    })

    return NextResponse.json({ success: true, viewCount: updated.viewCount })
  } catch (error) {
    console.error("POST /api/products/[id]/view error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
