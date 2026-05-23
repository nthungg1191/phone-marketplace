"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
}

export function DashboardLayout({ children, navGroups }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const getPageTitle = () => {
    const allItems = navGroups.flatMap((g) => g.items)
    const currentItem = allItems.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    )
    return currentItem?.label || "Dashboard"
  }

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
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
          <>
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-sm font-bold text-primary-foreground">EUT</span>
              </div>
              <div>
                <p className="font-bold text-lg leading-none">EUT</p>
                <p className="text-xs text-muted-foreground">Marketplace</p>
              </div>
            </Link>
          </>
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
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
                      )}
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
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
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
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
        <NavContent collapsed={isCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="bg-sidebar h-full">
            <NavContent />
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
