"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

type FilterOption = { id: string; name: string }

type AnalyticsFiltersProps = {
  categories?: FilterOption[]
  brands?: FilterOption[]
  showCategoryFilter?: boolean
  showBrandFilter?: boolean
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD for <input type="date">
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function AnalyticsFilters({
  categories = [],
  brands = [],
  showCategoryFilter = true,
  showBrandFilter = true,
}: AnalyticsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const fromParam = searchParams.get("from") ?? toIsoDate(defaultFrom)
  const toParam = searchParams.get("to") ?? toIsoDate(now)
  const categoryId = searchParams.get("categoryId") ?? ""
  const brandId = searchParams.get("brandId") ?? ""

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value.length > 0) params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  const reset = React.useCallback(() => {
    router.replace(pathname)
  }, [router, pathname])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              Từ ngày
            </Label>
            <Input
              id="from"
              type="date"
              value={fromParam}
              max={toParam}
              onChange={(e) => setParam("from", e.target.value)}
              className="w-[160px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              Đến ngày
            </Label>
            <Input
              id="to"
              type="date"
              value={toParam}
              min={fromParam}
              max={toIsoDate(now)}
              onChange={(e) => setParam("to", e.target.value)}
              className="w-[160px]"
            />
          </div>

          {showCategoryFilter && categories.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">Danh mục</Label>
              <Select
                value={categoryId || "all"}
                onValueChange={(v) => setParam("categoryId", v === "all" ? null : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {showBrandFilter && brands.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">Thương hiệu</Label>
              <Select
                value={brandId || "all"}
                onValueChange={(v) => setParam("brandId", v === "all" ? null : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thương hiệu</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Đặt lại
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}