"use client"

import * as React from "react"
import { Smartphone } from "lucide-react"

interface BrandLogoProps {
  src: string | null | undefined
  name: string
  className?: string
}

export function BrandLogo({ src, name, className = "h-10" }: BrandLogoProps) {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Smartphone className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={`object-contain mx-auto ${className}`}
      onError={() => setHasError(true)}
    />
  )
}
