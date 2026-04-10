import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Public routes that don't require authentication
const publicRoutes = ["/", "/auth/login", "/auth/register", "/products", "/search"]

// Admin-only routes
const adminRoutes = ["/admin"]

// Seller-only routes
const sellerRoutes = ["/seller", "/seller/products", "/seller/orders"]

// Routes that require approved seller status
const sellerApprovedRoutes = ["/seller/products/new"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Check if user is authenticated
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes protection
  if (session && adminRoutes.some((route) => pathname.startsWith(route))) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Seller routes protection
  if (session && sellerRoutes.some((route) => pathname.startsWith(route))) {
    if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Approved seller routes
  if (session && sellerApprovedRoutes.some((route) => pathname.startsWith(route))) {
    if (session.user.sellerStatus !== "APPROVED" && session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
