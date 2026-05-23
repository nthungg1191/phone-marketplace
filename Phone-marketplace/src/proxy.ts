import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const publicRoutes = ["/", "/products", "/brands", "/auth/login", "/auth/register", "/auth/error", "/api/auth"]
const protectedRoutes = ["/profile", "/orders", "/cart", "/wishlist", "/notifications", "/messages", "/settings", "/seller/register"]
const sellerRoutes = ["/seller/dashboard", "/seller/products", "/seller/orders"]
const adminRoutes = ["/admin", "/admin/users", "/admin/products", "/admin/orders", "/admin/settings"]

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const path = nextUrl.pathname

  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  const isLoggedIn = !!token
  const userRole = token?.role as string | undefined
  const sellerStatus = token?.sellerStatus as string | undefined

  const isPublicRoute = publicRoutes.some((route) => path === route || path.startsWith(route + "/"))
  if (isPublicRoute) return NextResponse.next()

  const isProtectedRoute = protectedRoutes.some((route) => path === route || path.startsWith(route + "/"))
  const isSellerRoute = sellerRoutes.some((route) => path === route || path.startsWith(route + "/"))
  const isAdminRoute = adminRoutes.some((route) => path === route || path.startsWith(route + "/"))

  if (!isLoggedIn && (isProtectedRoute || isSellerRoute || isAdminRoute)) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", path + nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && userRole !== "ADMIN") return NextResponse.redirect(new URL("/", req.url))
  if (isSellerRoute && (userRole !== "SELLER" || sellerStatus !== "APPROVED")) return NextResponse.redirect(new URL("/", req.url))

  if (isLoggedIn && path.startsWith("/auth/login")) {
    const callbackUrl = nextUrl.searchParams.get("callbackUrl")
    return NextResponse.redirect(new URL(callbackUrl || "/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
