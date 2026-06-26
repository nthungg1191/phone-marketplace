"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import ProductForm, { ProductFormData } from "@/components/shared/product-form"

interface ProductData {
  id: string
  title: string
  slug: string
  description: string | null
  price: string
  condition: string
  warranty: string
  ramGb: number
  storageGb: number
  color: string
  imei: string | null
  batteryHealth: number
  negotiable: boolean
  images: { url: string; isPrimary: boolean }[]
  brandId: string
  modelId: string
  categoryId: string
  healthCheck: {
    modelName: string
    serialNumber: string
    imei: string
    regionInfo: string
    wifiMacAddress: string
    bluetoothMacAddress: string
    activationStatus: string
    batteryCycleCount: number
    batteryManufacturer: string
    iosVersion: string
    jailbreakStatus: string
    batteryHealth: number
    batteryVoltage: string
    screen: string
    cameraFront: string
    cameraBack: string
    speaker: string
    microphone: string
    faceId: string
    fingerprint: string
    buttons: string
    wifi: string
    bluetooth: string
    nfc: string
    chargingPort: string
    proximitySensor: string
    accelerometer: string
    gyroscope: string
    facetime: string
    siri: string
    overallStatus: string
    notes: string
  }
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const { data: session, status } = useSession()
  const [product, setProduct] = React.useState<ProductData | undefined>()
  const [loading, setLoading] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SELLER" && session?.user?.sellerStatus !== "APPROVED") {
        router.push("/seller/register")
        return
      }
      fetchProduct()
    }
  }, [status, session, router, slug])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${slug}`)
      if (res.ok) {
        const data = await res.json()
        const productData = data.product

        // Check if this product belongs to the current user
        if (productData.sellerId !== session?.user?.id) {
          router.push("/seller/products")
          return
        }

        setProduct({
          id: productData.id,
          title: productData.title,
          slug: productData.slug,
          description: productData.description ?? "",
          price: productData.price,
          condition: productData.condition,
          warranty: productData.warranty || "OUT_OF_WARRANTY",
          ramGb: productData.ramGb,
          storageGb: productData.storageGb,
          color: productData.color,
          imei: productData.imei,
          batteryHealth: productData.batteryHealth,
          negotiable: productData.negotiable,
          images: productData.images.map((img: { url: string; isPrimary: boolean }) => ({
            url: img.url,
            isPrimary: img.isPrimary,
          })),
          brandId: productData.brandId,
          modelId: productData.modelId,
          categoryId: productData.categoryId,
          healthCheck: productData.healthCheck || {
            modelName: "",
            serialNumber: "",
            imei: "",
            regionInfo: "",
            wifiMacAddress: "",
            bluetoothMacAddress: "",
            activationStatus: "",
            batteryCycleCount: 0,
            batteryManufacturer: "",
            iosVersion: "",
            jailbreakStatus: "",
            batteryHealth: 100,
            batteryVoltage: "",
            screen: "NOT_TESTED",
            cameraFront: "NOT_TESTED",
            cameraBack: "NOT_TESTED",
            speaker: "NOT_TESTED",
            microphone: "NOT_TESTED",
            faceId: "NOT_TESTED",
            fingerprint: "NOT_TESTED",
            buttons: "NOT_TESTED",
            wifi: "NOT_TESTED",
            bluetooth: "NOT_TESTED",
            nfc: "NOT_TESTED",
            chargingPort: "NOT_TESTED",
            proximitySensor: "NOT_TESTED",
            accelerometer: "NOT_TESTED",
            gyroscope: "NOT_TESTED",
            facetime: "NOT_TESTED",
            siri: "NOT_TESTED",
            overallStatus: "",
            notes: "",
          },
        })
      } else {
        router.push("/seller/products")
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      router.push("/seller/products")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ProductFormData) => {
    if (!product) return

    setIsLoading(true)
    try {
      // Transform form data to match API schema
      const apiPayload: Record<string, unknown> = {
        brandId: data.brandId,
        modelId: data.modelId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        condition: data.condition,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        color: data.color,
        batteryHealth: data.batteryHealth,
        price: typeof data.price === "string" ? parseInt(data.price) : data.price,
        negotiable: data.negotiable,
        // Transform images: [{url, isPrimary}] -> string[]
        images: (data.images ?? []).map((img) =>
          typeof img === "string" ? img : img.url
        ),
        // Transform healthCheck: map form's 29 fields to API's 11 fields
        healthCheck: data.healthCheck
          ? {
              serialNumber: data.healthCheck.serialNumber,
              wifiMacAddress: data.healthCheck.wifiMacAddress,
              bluetoothMacAddress: data.healthCheck.bluetoothMacAddress,
              iosVersion: data.healthCheck.iosVersion,
              androidVersion: data.healthCheck.iosVersion ? undefined : undefined,
              activationStatus: data.healthCheck.activationStatus,
              jailbreakStatus: data.healthCheck.jailbreakStatus,
              securityLockStatus: data.healthCheck.jailbreakStatus ? undefined : undefined,
              batteryCycleCount: data.healthCheck.batteryCycleCount,
              batteryHealth: data.healthCheck.batteryHealth,
              screen: data.healthCheck.screen as "PASS" | "FAIL" | "NOT_TESTED",
              cameraFront: data.healthCheck.cameraFront as "PASS" | "FAIL" | "NOT_TESTED",
              cameraBack: data.healthCheck.cameraBack as "PASS" | "FAIL" | "NOT_TESTED",
              speaker: data.healthCheck.speaker as "PASS" | "FAIL" | "NOT_TESTED",
              microphone: data.healthCheck.microphone as "PASS" | "FAIL" | "NOT_TESTED",
              wifi: data.healthCheck.wifi as "PASS" | "FAIL" | "NOT_TESTED",
              bluetooth: data.healthCheck.bluetooth as "PASS" | "FAIL" | "NOT_TESTED",
              fingerprint: data.healthCheck.fingerprint as "PASS" | "FAIL" | "NOT_TESTED",
              faceId: data.healthCheck.faceId as "PASS" | "FAIL" | "NOT_TESTED",
              chargingPort: data.healthCheck.chargingPort as "PASS" | "FAIL" | "NOT_TESTED",
              overallStatus: data.healthCheck.overallStatus,
              notes: data.healthCheck.notes,
            }
          : undefined,
      }

      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      })

      if (res.ok) {
        router.push("/seller/products")
      } else {
        let message = "Có lỗi xảy ra"
        try {
          const body = await res.json()
          message = body?.error || message
        } catch {
          // Response had no JSON body
        }
        throw new Error(message)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại")
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <ProductForm
      product={product}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  )
}
