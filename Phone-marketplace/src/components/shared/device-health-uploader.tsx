"use client"

import * as React from "react"
import { Upload, Loader2, Sparkles, AlertCircle, CheckCircle2, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ParsedHealthData {
  // Device Info
  modelName?: string
  serialNumber?: string
  imei?: string
  regionInfo?: string
  wifiMacAddress?: string
  bluetoothMacAddress?: string
  activationStatus?: string
  batteryCycleCount?: number
  batteryManufacturer?: string
  
  // Battery
  batteryHealth: number
  batteryVoltage?: string
  
  // All components
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
  
  // Summary
  overallStatus?: string
  notes?: string
  
  // AI
  confidence: number
}

interface DeviceHealthUploaderProps {
  onDataExtracted: (data: ParsedHealthData) => void
  onManualEntry: () => void
}

export default function DeviceHealthUploader({
  onDataExtracted,
  onManualEntry,
}: DeviceHealthUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [parsedData, setParsedData] = React.useState<ParsedHealthData | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Chỉ chấp nhận file PNG, JPG, hoặc WEBP")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Ảnh quá lớn. Vui lòng sử dụng ảnh < 10MB")
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setError(null)
    setParsedData(null)

    analyzeImage(file)
  }

  const analyzeImage = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/ocr/analyze-device", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Có lỗi xảy ra")
      }

      setParsedData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra"
      setError(message)
      setParsedData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setPreviewUrl(null)
    setError(null)
    setParsedData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASS":
        return "text-green-600 bg-green-50 border-green-200"
      case "FAIL":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-500 bg-gray-50 border-gray-200"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.5) return "text-yellow-600"
    return "text-red-600"
  }

  // All health check components
  const allComponents = [
    { key: 'screen', label: 'Màn hình' },
    { key: 'cameraFront', label: 'Cam trước' },
    { key: 'cameraBack', label: 'Cam sau' },
    { key: 'speaker', label: 'Loa' },
    { key: 'microphone', label: 'Micro' },
    { key: 'faceId', label: 'Face ID' },
    { key: 'fingerprint', label: 'Touch ID' },
    { key: 'buttons', label: 'Nút bấm' },
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'bluetooth', label: 'Bluetooth' },
    { key: 'nfc', label: 'NFC' },
    { key: 'chargingPort', label: 'Cổng sạc' },
    { key: 'proximitySensor', label: 'Cảm biến xa' },
    { key: 'accelerometer', label: 'Gia tốc' },
    { key: 'gyroscope', label: 'Con quay' },
    { key: 'facetime', label: 'FaceTime' },
    { key: 'siri', label: 'Siri' },
  ]

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm border border-blue-200">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Hướng dẫn sử dụng 3uTools:
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>Kết nối iPhone với máy tính qua cáp USB</li>
          <li>Mở phần mềm <strong>3uTools</strong></li>
          <li>Vào mục <strong>Toolbox</strong> → <strong>Device Report</strong></li>
          <li>Chụp ảnh màn hình kết quả (ảnh phải rõ ràng)</li>
          <li>Upload ảnh bên dưới để AI phân tích</li>
        </ol>
      </div>

      {/* Upload Area */}
      {!previewUrl ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Kéo thả hoặc click để upload ảnh
          </p>
          <p className="text-sm text-muted-foreground">
            PNG, JPG, WEBP - Tối đa 10MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full rounded-lg border"
            />
            <button
              onClick={reset}
              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>AI đang phân tích hình ảnh...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-600">Phân tích thất bại</p>
                <p className="text-sm text-red-600/80">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => analyzeImage(fileInputRef.current?.files?.[0] as File)}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Thử lại
              </Button>
            </div>
          )}

          {/* Parsed Results */}
          {parsedData && !isLoading && (
            <div className="space-y-4">
              {/* Confidence Score */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={cn(
                    "h-5 w-5",
                    parsedData.confidence >= 0.8
                      ? "text-green-600"
                      : parsedData.confidence >= 0.5
                      ? "text-yellow-600"
                      : "text-red-600"
                  )} />
                  <span className="font-medium">Độ chính xác AI</span>
                </div>
                <span className={cn("font-bold", getConfidenceColor(parsedData.confidence))}>
                  {Math.round(parsedData.confidence * 100)}%
                </span>
              </div>

              {/* Low Confidence Warning */}
              {parsedData.confidence < 0.7 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <p className="text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Kết quả có thể không chính xác. Vui lòng kiểm tra lại các thông số.
                  </p>
                </div>
              )}

              {/* Device Info */}
              {(parsedData.modelName || parsedData.serialNumber || parsedData.activationStatus) && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="font-medium mb-2 text-sm">Thông tin thiết bị</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {parsedData.modelName && (
                      <div>
                        <span className="text-blue-600">Model:</span> {parsedData.modelName}
                      </div>
                    )}
                    {parsedData.serialNumber && (
                      <div>
                        <span className="text-blue-600">Serial:</span> {parsedData.serialNumber}
                      </div>
                    )}
                    {parsedData.activationStatus && (
                      <div>
                        <span className="text-blue-600">Kích hoạt:</span> {parsedData.activationStatus}
                      </div>
                    )}
                    {parsedData.batteryCycleCount && (
                      <div>
                        <span className="text-blue-600">Số lần sạc:</span> {parsedData.batteryCycleCount}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Battery Info */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Pin</h4>
                  {parsedData.batteryVoltage && (
                    <span className="text-sm text-green-700">{parsedData.batteryVoltage}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-green-700">
                    {parsedData.batteryHealth}%
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-green-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{ width: `${parsedData.batteryHealth}%` }}
                      />
                    </div>
                  </div>
                </div>
                {parsedData.batteryManufacturer && (
                  <p className="text-sm text-green-700 mt-2">
                    Nhà sản xuất: {parsedData.batteryManufacturer}
                  </p>
                )}
              </div>

              {/* Health Check Grid - 2 columns */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {allComponents.map((item) => {
                  const status = parsedData[item.key as keyof ParsedHealthData] as string
                  return (
                    <div 
                      key={item.key} 
                      className={cn(
                        "p-3 rounded-lg border text-center",
                        getStatusColor(status)
                      )}
                    >
                      <p className="text-xs mb-1 opacity-80">{item.label}</p>
                      <p className="font-bold text-lg">
                        {status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "–"}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Notes */}
              {parsedData.notes && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium mb-1">Ghi chú từ AI:</p>
                  <p className="text-muted-foreground">{parsedData.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={reset}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Upload lại ảnh khác
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => onDataExtracted(parsedData)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Xác nhận & Tiếp tục
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={onManualEntry}
        >
          Nhập thủ công thay vì upload ảnh
        </Button>
      </div>
    </div>
  )
}
