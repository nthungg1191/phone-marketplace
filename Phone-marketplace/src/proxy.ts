import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const publicRoutes = [
  "/",
  "/products",
  "/brands",
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/api/auth",
]

const buyerOnlyRoutes = ["/checkout"]

const sellerOnlyRoutes = [
  "/seller/dashboard",
  "/seller/products",
  "/seller/orders",
]

const adminOnlyRoutes = [
  "/admin",
  "/admin/users",
  "/admin/products",
  "/admin/orders",
  "/admin/settings",
]

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const path = nextUrl.pathname

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: "authjs.session-token",
  })

  const isLoggedIn = !!token?.user
  const userRole = token?.role as string | undefined
  const sellerStatus = token?.sellerStatus as string | undefined

  const isPublicRoute = publicRoutes.some(
    (route) =>
      path === route ||
      path.startsWith(route + "/") ||
      path.startsWith("/api/")
  )

  if (path.startsWith("/api/") && !path.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (isPublicRoute && !path.startsWith("/api/")) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", path)
    return NextResponse.redirect(loginUrl)
  }

  const isAdminRoute = adminOnlyRoutes.some(
    (route) => path === route || path.startsWith(route + "/")
  )

  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const isSellerRoute = sellerOnlyRoutes.some(
    (route) => path === route || path.startsWith(route + "/")
  )

  if (isSellerRoute) {
    if (userRole !== "SELLER" || sellerStatus !== "APPROVED") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
