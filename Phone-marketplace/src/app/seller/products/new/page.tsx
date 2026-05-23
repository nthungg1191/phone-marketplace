"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import ProductForm, { ProductFormData } from "@/components/shared/product-form"

export default function NewProductPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/seller/products/new")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SELLER" && session?.user?.sellerStatus !== "APPROVED") {
        router.push("/seller/register")
        return
      }
    }
  }, [status, session, router])

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/products/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const result = await res.json()
        router.push("/seller/products")
      } else {
        const error = await res.json()
        throw new Error(error.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại")
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
  )
}
