"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  Settings,
  Shield,
  Heart,
  MessageCircle,
  LayoutDashboard,
  Package,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationPopover } from "./notification-popover"
import { SellerRegisterModal } from "./seller-register-modal"
import { SettingsModal } from "./settings-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [mounted, setMounted] = useState(
    typeof window !== "undefined"
  )

  const user = session?.user

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
    }
  }, [mounted])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fetch notifications
  useEffect(() => {
    if (status !== "authenticated") {
      return
    }

    const fetchUnreadMessages = async () => {
      try {
        const res = await fetch("/api/messages/unread-count")
        if (res.ok) {
          const data = await res.json()
          setUnreadMessages(data.count || 0)
        }
      } catch {
        // Silent fail
      }
    }

    const fetchCartCount = async () => {
      try {
        const res = await fetch("/api/cart/count")
        if (res.ok) {
          const data = await res.json()
          setCartCount(data.count || 0)
        }
      } catch {
        // Silent fail
      }
    }

    fetchUnreadMessages()
    fetchCartCount()

    const interval = setInterval(() => {
      fetchUnreadMessages()
      fetchCartCount()
    }, 30000)

    const handleCartUpdate = () => fetchCartCount()
    window.addEventListener("cart-updated", handleCartUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener("cart-updated", handleCartUpdate)
    }
  }, [status])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const navItems = [
    { href: "/products", label: "Sản phẩm" },
    { href: "/brands", label: "Thương hiệu" },
  ]

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-200",
          isScrolled
            ? "bg-background/95 backdrop-blur-md border-b shadow-sm"
            : "bg-background border-b"
        )}
        style={{ viewTransitionName: "site-header" }}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/logo.png"
                alt="HNT"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  Quản trị
                </Link>
              )}
            </nav>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Tìm kiếm sản phẩm..."
                  aria-label="Tìm kiếm sản phẩm"
                  autoComplete="off"
                  className="w-full h-10 pl-10 pr-4 rounded-lg border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Authenticated Actions */}
              {mounted && status === "authenticated" && (
                <>
                  {/* Messages */}
                  <Link
                    href="/messages"
                    className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Tin nhắn"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Link>

                  {/* Notifications */}
                  <NotificationPopover />
                </>
              )}

              {/* User Menu */}
              {mounted && (
                <>
                  {status === "loading" ? (
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  ) : status === "authenticated" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors">
                          <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary transition-colors">
                            <AvatarImage src={user?.image || ""} alt={user?.name || "Avatar"} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {user?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Hồ sơ cá nhân
                          </Link>
                        </DropdownMenuItem>
                        {(user?.role === "SELLER") && (
                          <DropdownMenuItem asChild>
                            <Link href="/seller/dashboard" className="cursor-pointer">
                              <LayoutDashboard className="mr-2 h-4 w-4" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href="/orders" className="cursor-pointer">
                            <Package className="mr-2 h-4 w-4" />
                            Đơn hàng
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/wishlist" className="cursor-pointer">
                            <Heart className="mr-2 h-4 w-4" />
                            Yêu thích
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setIsSettingsModalOpen(true)}
                          className="cursor-pointer"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Cài đặt
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Đăng xuất
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="hidden sm:flex items-center gap-2">
                      <Link href="/auth/login">
                        <Button variant="ghost" size="sm">
                          Đăng nhập
                        </Button>
                      </Link>
                      <Link href="/auth/register">
                        <Button size="sm">
                          Đăng ký
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* Mobile Menu */}
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle>
                      <Link href="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                        <Image
                          src="/logo.png"
                          alt="HNT"
                          width={96}
                          height={32}
                          className="h-8 w-auto"
                        />
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                          pathname === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {mounted && status !== "authenticated" && (
                      <>
                        <div className="h-px bg-border my-2" />
                        <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start">
                            <User className="mr-2 h-4 w-4" />
                            Đăng nhập
                          </Button>
                        </Link>
                        <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                          <Button className="w-full justify-start">
                            Đăng ký
                          </Button>
                        </Link>
                      </>
                    )}
                    {mounted && status === "authenticated" && user?.role === "ADMIN" && (
                      <>
                        <div className="h-px bg-border my-2" />
                        <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Shield className="mr-2 h-4 w-4" />
                            Quản trị
                          </Button>
                        </Link>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Seller Register Modal */}
      <SellerRegisterModal
        open={isSellerModalOpen}
        onOpenChange={setIsSellerModalOpen}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />
    </>
  )
}
