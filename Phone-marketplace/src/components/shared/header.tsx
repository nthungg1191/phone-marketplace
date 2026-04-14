"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import {
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Package,
  Settings,
  Shield,
  Heart,
  Bell,
} from "lucide-react"

export function Header() {
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSellerMenuOpen, setIsSellerMenuOpen] = useState(false)

  const user = session?.user

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">EUT</span>
            </div>
            <span className="hidden sm:block font-bold text-xl">Marketplace</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/products"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sản phẩm
            </Link>
            <Link
              href="/brands"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Thương hiệu
            </Link>
            {user?.role === "SELLER" && user?.sellerStatus === "APPROVED" && (
              <div className="relative">
                <button
                  onClick={() => setIsSellerMenuOpen(!isSellerMenuOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Quản lý
                  <ChevronDown className="h-4 w-4" />
                </button>
                {isSellerMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-lg shadow-lg py-1">
                    <Link
                      href="/seller/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <Package className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/seller/products"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      Sản phẩm của tôi
                    </Link>
                    <Link
                      href="/seller/orders"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      Đơn hàng
                    </Link>
                  </div>
                )}
              </div>
            )}
            {user?.role === "ADMIN" && (
              <div className="relative">
                <button
                  onClick={() => setIsSellerMenuOpen(!isSellerMenuOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Admin
                  <ChevronDown className="h-4 w-4" />
                </button>
                {isSellerMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-lg shadow-lg py-1">
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <Shield className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      Người dùng
                    </Link>
                    <Link
                      href="/admin/products"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      Sản phẩm
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                0
              </span>
            </Link>

            {/* Notifications */}
            {status === "authenticated" && (
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  0
                </span>
              </Link>
            )}

            {/* User Menu */}
            {status === "loading" ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : status === "authenticated" ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "Avatar"}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-background border rounded-lg shadow-lg py-1">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.role !== "BUYER" && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full capitalize">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <User className="h-4 w-4" />
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      href="/wishlist"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <Heart className="h-4 w-4" />
                      Yêu thích
                    </Link>
                    {user.role === "BUYER" && (
                      <Link
                        href="/seller/register"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                      >
                        Đăng ký bán hàng
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <Settings className="h-4 w-4" />
                      Cài đặt
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <button className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/auth/register">
                  <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Đăng ký
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col gap-2">
              <Link
                href="/products"
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted"
              >
                Sản phẩm
              </Link>
              <Link
                href="/brands"
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted"
              >
                Thương hiệu
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
