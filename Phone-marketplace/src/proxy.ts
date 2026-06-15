import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const PUBLIC_PREFIXES = ["/", "/products", "/brands", "/stores", "/auth", "/search", "/cart", "/checkout"]

const PROTECTED_PREFIXES = ["/profile", "/orders", "/wishlist", "/notifications", "/messages", "/settings", "/addresses"]

const SELLER_PREFIXES = ["/seller"]

const ADMIN_PREFIXES = ["/admin"]

function matchesRoute(path: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  )
}

export default async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  
  // Use NextAuth's auth() function - Edge compatible
  const session = await auth()
  
  const isLoggedIn = !!session?.user
  const userRole = session?.user?.role as string | undefined
  const sellerStatus = session?.user?.sellerStatus as string | undefined
  const isLocked = session?.user?.isLocked as boolean | undefined

  // If session exists but user is locked, redirect to login
  if (isLoggedIn && isLocked) {
    return NextResponse.redirect(new URL("/auth/login?locked=1", req.url))
  }

  // Public routes - allow access
  if (matchesRoute(pathname, PUBLIC_PREFIXES)) {
    if (isLoggedIn && pathname.startsWith("/auth/login")) {
      const callbackUrl = searchParams.get("callbackUrl")
      return NextResponse.redirect(new URL(callbackUrl || "/", req.url))
    }
    return NextResponse.next()
  }

  // Protected routes - require login
  if (matchesRoute(pathname, PROTECTED_PREFIXES) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.url)
    const callback = pathname + (searchParams.toString() ? "?" + searchParams.toString() : "")
    loginUrl.searchParams.set("callbackUrl", callback)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes - require ADMIN role
  if (matchesRoute(pathname, ADMIN_PREFIXES)) {
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  // Seller routes - require SELLER role
  if (matchesRoute(pathname, SELLER_PREFIXES)) {
    if (userRole !== "SELLER" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    
    // Seller approval check for product creation
    if (pathname.startsWith("/seller/products/new") && sellerStatus !== "APPROVED" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
