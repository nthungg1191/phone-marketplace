"use client"

import * as React from "react"
import { Upload, Loader2, X, GripVertical, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  images?: string[] | { url: string; isPrimary: boolean }[]
  onChange: (images: { url: string; isPrimary: boolean }[]) => void
  maxImages?: number
  disabled?: boolean
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 6,
  disabled = false,
}: ImageUploaderProps) {
  // Normalize images to string[] (handle both string[] and { url: string }[])
  const normalizedImages: string[] = (images || []).map((img) =>
    typeof img === "string" ? img : img.url
  )

  const [isUploading, setIsUploading] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const isUploadingRef = React.useRef(false)
  const [inputKey, setInputKey] = React.useState(0)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = maxImages - normalizedImages.length
    if (remainingSlots <= 0) {
      alert(`Chỉ được upload tối đa ${maxImages} ảnh`)
      e.target.value = ""
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    isUploadingRef.current = true

    try {
      await uploadFiles(filesToUpload)
    } finally {
      e.target.value = ""
      isUploadingRef.current = false
      // Force remount file input to reset its state
      setInputKey(k => k + 1)
    }
  }

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)

    try {
      const uploadedUrls: string[] = []
      const failedFiles: string[] = []

      for (const file of files) {
        // Validate file
        if (!file.type.startsWith("image/")) {
          console.error("Not an image:", file.name)
          failedFiles.push(file.name)
          continue
        }

        if (file.size > 5 * 1024 * 1024) {
          console.error("File too large:", file.name)
          failedFiles.push(`${file.name} (>5MB)`)
          continue
        }

        // Create form data for upload
        const formData = new FormData()
        formData.append("file", file)
        formData.append("upload_preset", "phone-marketplace")

        // Upload to Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Upload failed:", file.name, errorText)
          failedFiles.push(file.name)
          continue
        }

        const data = await response.json()
        uploadedUrls.push(data.secure_url)
      }

      if (failedFiles.length > 0) {
        alert(`Không thể upload: ${failedFiles.join(", ")}`)
      }

      if (uploadedUrls.length > 0) {
        const newImages = [
          ...normalizedImages.map((url, i) => ({ url, isPrimary: i === 0 })),
          ...uploadedUrls.map((url, i) => ({ url, isPrimary: false }))
        ]
        onChange(newImages)
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Có lỗi khi upload ảnh. Vui lòng thử lại.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = (index: number) => {
    const filtered = normalizedImages.filter((_, i) => i !== index)
    const newImages = filtered.map((url, i) => ({ url, isPrimary: i === 0 }))
    onChange(newImages)
  }

  const handleSetPrimary = (index: number) => {
    if (index === 0) return // Already primary
    const reordered = [normalizedImages[index], ...normalizedImages.slice(0, index), ...normalizedImages.slice(index + 1)]
    const newImages = reordered.map((url, i) => ({ url, isPrimary: i === 0 }))
    onChange(newImages)
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return

    const reordered = [...normalizedImages]
    const draggedItem = reordered[dragIndex]
    reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, draggedItem)
    const newImages = reordered.map((url, i) => ({ url, isPrimary: i === 0 }))
    onChange(newImages)
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        key={inputKey}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Image grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {/* Existing images */}
        {normalizedImages.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
              index === 0 ? "border-primary" : "border-muted",
              dragIndex === index && "opacity-50",
              !disabled && "cursor-move"
            )}
          >
            <img
              src={url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Primary badge */}
            {index === 0 && (
              <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                Ảnh chính
              </span>
            )}

            {/* Actions */}
            {!disabled && (
              <div className="absolute top-1 right-1 flex gap-1">
                {/* Set primary */}
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    className="p-1 bg-background/80 rounded hover:bg-background"
                    title="Đặt làm ảnh chính"
                  >
                    <ImageIcon className="h-3 w-3" />
                  </button>
                )}
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1 bg-red-500/80 text-white rounded hover:bg-red-500"
                  title="Xóa ảnh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Drag handle */}
            {!disabled && (
              <div className="absolute bottom-1 left-1 p-1 bg-background/80 rounded opacity-0 hover:opacity-100 transition-opacity">
                <GripVertical className="h-3 w-3" />
              </div>
            )}
          </div>
        ))}

        {/* Upload button */}
        {normalizedImages.length < maxImages && !disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors",
              isUploading && "cursor-not-allowed opacity-50"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Đang tải...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Thêm ảnh
                </span>
              </>
            )}
          </button>
        )}

        {/* Empty slots placeholder */}
        {!disabled &&
          Array.from({ length: Math.max(0, maxImages - normalizedImages.length - 1) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center"
            >
              <span className="text-xs text-muted-foreground/50">
                {normalizedImages.length + i + 1}/{maxImages}
              </span>
            </div>
          ))}
      </div>

      {/* Info */}
      <p className="text-sm text-muted-foreground">
        Tối đa {maxImages} ảnh. Kéo thả để sắp xếp. Ảnh đầu tiên sẽ là ảnh chính.
      </p>
    </div>
  )
}
