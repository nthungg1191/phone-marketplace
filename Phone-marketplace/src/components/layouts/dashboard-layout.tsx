"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navGroups: NavGroup[]
  pendingCounts?: {
    sellers?: number
    products?: number
    returns?: number
    complaints?: number
    violations?: number
  }
}

interface NavContentProps {
  collapsed: boolean
  navGroups: NavGroup[]
  pathname: string
  onToggleCollapse: () => void
  pendingCounts?: DashboardLayoutProps["pendingCounts"]
  isMobile?: boolean
}

function getBadgeCount(item: NavItem, pendingCounts?: DashboardLayoutProps["pendingCounts"]): number | undefined {
  if (pendingCounts === undefined) return item.badge

  const hrefLower = item.href.toLowerCase()
  if (hrefLower.includes("sellers")) return pendingCounts.sellers
  if (hrefLower.includes("products")) return pendingCounts.products
  if (hrefLower.includes("returns") || hrefLower.includes("hoan")) return pendingCounts.returns
  if (hrefLower.includes("complaints") || hrefLower.includes("khieu-nai")) return pendingCounts.complaints
  if (hrefLower.includes("violations") || hrefLower.includes("vi-pham")) return pendingCounts.violations

  return item.badge
}

function NavContent({ collapsed, navGroups, pathname, onToggleCollapse, pendingCounts, isMobile }: NavContentProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b transition-all",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {collapsed ? (
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <p className="text-sm font-bold text-primary-foreground">EUT</p>
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-sm font-bold text-primary-foreground">EUT</span>
            </div>
            <div>
              <p className="font-bold text-lg leading-none">EUT</p>
              <p className="text-xs text-muted-foreground">Marketplace</p>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-6" : ""}>
              {group.label && (
                collapsed ? (
                  <div className="px-3 mb-2">
                    <div className="h-px bg-border" />
                  </div>
                ) : (
                  <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                )
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon
                  const badgeCount = getBadgeCount(item, pendingCounts)

                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-foreground")} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {badgeCount !== undefined && badgeCount > 0 && (
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-red-500 text-white"
                              )}
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && badgeCount !== undefined && badgeCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{item.label}</span>
                            {badgeCount !== undefined && badgeCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {badgeCount}
                              </span>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 space-y-1">
        {/* Notifications */}
        {!collapsed && (
          <Link
            href="/notifications"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="text-sm font-medium">Thông báo</span>
          </Link>
        )}

        {/* Collapse Toggle - Desktop */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Thu gọn</span>
              </>
            )}
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="text-sm font-medium">Đăng xuất</span>}
        </button>
      </div>
    </div>
  )

  return navContent
}

export function DashboardLayout({ children, navGroups, pendingCounts }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mounted, setMounted] = React.useState(
    typeof window !== "undefined"
  )

  React.useEffect(() => {
    if (!mounted) {
      setMounted(true)
    }
  }, [mounted])

  const getPageTitle = () => {
    const allItems = navGroups.flatMap((g) => g.items)
    const currentItem = allItems.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    )
    return currentItem?.label || "Dashboard"
  }

  if (!mounted) {
    return (
      <div className="flex h-screen bg-muted/30">
        <div className={cn(
          "bg-sidebar border-r transition-all hidden lg:block",
          isCollapsed ? "w-[72px]" : "w-64"
        )} />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r transition-all duration-300 fixed left-0 top-0 h-full z-40",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        <NavContent
          collapsed={isCollapsed}
          navGroups={navGroups}
          pathname={pathname}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          pendingCounts={pendingCounts}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="bg-sidebar h-full">
            <NavContent
              collapsed={false}
              navGroups={navGroups}
              pathname={pathname}
              onToggleCollapse={() => {}}
              pendingCounts={pendingCounts}
              isMobile
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          !isCollapsed && "lg:ml-64"
        )}
      >
        {/* Top Bar */}
        <header className="h-16 bg-background border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <h2 className="text-lg font-semibold">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "Avatar"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
