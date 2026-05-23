"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldOff, Clock, AlertTriangle } from "lucide-react"

interface LockedAccountGuardProps {
  children: React.ReactNode
}

export function LockedAccountGuard({ children }: LockedAccountGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showLockDialog, setShowLockDialog] = React.useState(false)

  React.useEffect(() => {
    // Check if user is logged in and locked
    if (status === "authenticated" && session?.user) {
      if (session.user.isLocked) {
        setShowLockDialog(true)
      }
    }
  }, [status, session])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    setShowLockDialog(false)
    router.push("/auth/login")
  }

  const formatLockedAt = (dateStr: string | null) => {
    if (!dateStr) return ""
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  // Show loading while checking session
  if (status === "loading") {
    return null
  }

  return (
    <>
      {children}

      {/* Locked Account Dialog */}
      <Dialog open={showLockDialog} onOpenChange={() => setShowLockDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldOff className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-600">Tài khoản đã bị khóa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Lock Reason */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lý do khóa</p>
                  <p className="font-medium mt-1">{session?.user?.lockedReason || "Tài khoản đã bị khóa bởi quản trị viên"}</p>
                </div>
              </div>
            </div>

            {/* Lock Time */}
            {session?.user?.lockedAt && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Thời gian khóa</p>
                    <p className="font-medium mt-1">{formatLockedAt(session.user.lockedAt)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Liên hệ hỗ trợ:</strong> Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ qua email <strong>hotro@eutmarket.com</strong> để được giải quyết.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
