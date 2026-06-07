import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_PREFIXES = ["/", "/products", "/brands", "/auth"]
const PROTECTED_PREFIXES = ["/profile", "/orders", "/cart", "/wishlist", "/notifications", "/messages", "/settings", "/seller/register"]
const SELLER_PREFIXES = ["/seller/dashboard", "/seller/products", "/seller/orders"]
const ADMIN_PREFIXES = ["/admin"]

function matchesAnyRoute(path: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  )
}

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  const isLoggedIn = !!token
  const userRole = token?.role as string | undefined
  const sellerStatus = token?.sellerStatus as string | undefined

  if (matchesAnyRoute(pathname, PUBLIC_PREFIXES)) {
    if (isLoggedIn && pathname.startsWith("/auth/login")) {
      const callbackUrl = searchParams.get("callbackUrl")
      return NextResponse.redirect(new URL(callbackUrl || "/", req.url))
    }
    return NextResponse.next()
  }

  if (matchesAnyRoute(pathname, PROTECTED_PREFIXES) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname + searchParams)
    return NextResponse.redirect(loginUrl)
  }

  if (matchesAnyRoute(pathname, ADMIN_PREFIXES) && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (matchesAnyRoute(pathname, SELLER_PREFIXES) && (userRole !== "SELLER" || sellerStatus !== "APPROVED")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
