import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

// Khởi tạo secret cho JWT verification (Edge-compatible)
const getSecret = () => {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set")
  }
  return new TextEncoder().encode(secret)
}

// Các route công khai - không cần đăng nhập
const publicRoutes = ["/", "/auth/login", "/auth/register", "/products", "/search"]
const adminRoutes = ["/admin"]
const sellerRoutes = ["/seller"]
const sellerApprovedRoutes = ["/seller/products/new"]

// Kiểm tra xem route có thuộc danh sách không
const matchRoute = (pathname: string, routes: string[]) => {
  return routes.some((route) => pathname.startsWith(route))
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Cho phép các route công khai
  if (matchRoute(pathname, publicRoutes)) {
    return NextResponse.next()
  }

  // Lấy token từ cookie
  const token = req.cookies.get("authjs.session-token")?.value ||
                 req.cookies.get("__Secure-authjs.session-token")?.value

  // Nếu không có token và không phải route công khai -> redirect login
  if (!token) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify JWT (Edge-compatible, không cần Prisma)
    const { payload } = await jwtVerify(token, getSecret())

    const user = payload as {
      id?: string
      role?: string
      sellerStatus?: string
      name?: string
      email?: string
    }

    // Kiểm tra route admin
    if (matchRoute(pathname, adminRoutes)) {
      if (user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }

    // Kiểm tra route seller
    if (matchRoute(pathname, sellerRoutes)) {
      if (user.role !== "SELLER" && user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }

    // Kiểm tra route cần seller đã approved
    if (matchRoute(pathname, sellerApprovedRoutes)) {
      if (user.sellerStatus !== "APPROVED" && user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }

    return NextResponse.next()
  } catch {
    // Token không hợp lệ -> redirect login
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
