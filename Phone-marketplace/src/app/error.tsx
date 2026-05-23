"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Đã xảy ra lỗi</h1>
        <p className="text-muted-foreground mb-2">
          Rất tiếc, đã có lỗi không mong muốn xảy ra.
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="text-sm text-muted-foreground mb-6 p-3 bg-muted rounded-lg text-left font-mono">
            {error.message}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
