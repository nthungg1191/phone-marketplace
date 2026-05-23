"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { Star, Grid3X3, List, X, SlidersHorizontal, Search, Smartphone, Filter, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductCardSkeleton } from "@/components/shared/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

interface Product {
  id: string
  title: string
  slug: string
  price: string
  condition: string
  ramGb: number
  storageGb: number
  color: string
  batteryHealth: number
  images: { url: string }[]
  brand: { name: string }
  seller: {
    name: string
    sellerRank: string
    sellerStats: { avgRating: string } | null
  }
}

interface Brand {
  id: string
  name: string
  slug: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const conditions = [
  { value: "LIKE_NEW", label: "Như mới (99-100%)" },
  { value: "PERFECT_99", label: "99%" },
  { value: "EXCELLENT_98", label: "98%" },
  { value: "EXCELLENT_97", label: "97%" },
  { value: "GOOD", label: "Dưới 97%" },
]

const batteryOptions = [
  { value: 90, label: "90%+" },
  { value: 85, label: "85%+" },
  { value: 80, label: "80%+" },
  { value: 70, label: "70%+" },
]

const ramOptions = [4, 6, 8, 12, 16]
const storageOptions = [64, 128, 256, 512, 1024]

function FilterSidebar({
  brands,
  selectedBrands,
  setSelectedBrands,
  selectedConditions,
  setSelectedConditions,
  selectedBattery,
  setSelectedBattery,
  selectedRam,
  setSelectedRam,
  selectedStorage,
  setSelectedStorage,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
}: {
  brands: Brand[]
  selectedBrands: string[]
  setSelectedBrands: (brands: string[]) => void
  selectedConditions: string[]
  setSelectedConditions: (conditions: string[]) => void
  selectedBattery: number | null
  setSelectedBattery: (battery: number | null) => void
  selectedRam: number[]
  setSelectedRam: (ram: number[]) => void
  selectedStorage: number[]
  setSelectedStorage: (storage: number[]) => void
  minPrice: string
  setMinPrice: (price: string) => void
  maxPrice: string
  setMaxPrice: (price: string) => void
}) {
  const toggleBrand = (brandId: string) => {
    setSelectedBrands(
      selectedBrands.includes(brandId)
        ? selectedBrands.filter(id => id !== brandId)
        : [...selectedBrands, brandId]
    )
  }

  const toggleCondition = (condition: string) => {
    setSelectedConditions(
      selectedConditions.includes(condition)
        ? selectedConditions.filter(c => c !== condition)
        : [...selectedConditions, condition]
    )
  }

  const toggleRam = (ram: number) => {
    setSelectedRam(
      selectedRam.includes(ram)
        ? selectedRam.filter(r => r !== ram)
        : [...selectedRam, ram]
    )
  }

  const toggleStorage = (storage: number) => {
    setSelectedStorage(
      selectedStorage.includes(storage)
        ? selectedStorage.filter(s => s !== storage)
        : [...selectedStorage, storage]
    )
  }

  const clearFilters = () => {
    setSelectedBrands([])
    setSelectedConditions([])
    setSelectedBattery(null)
    setSelectedRam([])
    setSelectedStorage([])
    setMinPrice("")
    setMaxPrice("")
  }

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedConditions.length > 0 ||
    selectedBattery !== null ||
    selectedRam.length > 0 ||
    selectedStorage.length > 0 ||
    minPrice ||
    maxPrice

  return (
    <div className="space-y-6">
      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters} className="w-full text-destructive hover:text-destructive">
          <X className="h-4 w-4 mr-2" />
          Xóa bộ lọc
        </Button>
      )}

      <Accordion type="multiple" defaultValue={["brands", "condition", "price"]} className="w-full">
        <AccordionItem value="brands">
          <AccordionTrigger className="font-semibold">Thương hiệu</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {brands.map(brand => (
                <label key={brand.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                  <Checkbox
                    checked={selectedBrands.includes(brand.id)}
                    onCheckedChange={() => toggleBrand(brand.id)}
                  />
                  <span className="text-sm flex-1">{brand.name}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="condition">
          <AccordionTrigger className="font-semibold">Tình trạng</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {conditions.map(condition => (
                <label key={condition.value} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                  <Checkbox
                    checked={selectedConditions.includes(condition.value)}
                    onCheckedChange={() => toggleCondition(condition.value)}
                  />
                  <span className="text-sm flex-1">{condition.label}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="battery">
          <AccordionTrigger className="font-semibold">Dung lượng pin</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2">
              {batteryOptions.map(option => (
                <Button
                  key={option.value}
                  variant={selectedBattery === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedBattery(selectedBattery === option.value ? null : option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ram">
          <AccordionTrigger className="font-semibold">RAM</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {ramOptions.map(ram => (
                <Button
                  key={ram}
                  variant={selectedRam.includes(ram) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRam(ram)}
                  className="text-xs"
                >
                  {ram}GB
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="storage">
          <AccordionTrigger className="font-semibold">Bộ nhớ</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {storageOptions.map(storage => (
                <Button
                  key={storage}
                  variant={selectedStorage.includes(storage) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleStorage(storage)}
                  className="text-xs"
                >
                  {storage >= 1024 ? `${storage / 1024}TB` : `${storage}GB`}
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger className="font-semibold">Khoảng giá</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Từ"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="h-9 text-sm"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Đến"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = React.useState<Product[]>([])
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [pagination, setPagination] = React.useState<Pagination | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")

  const [search, setSearch] = React.useState(searchParams.get("search") || "")
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>(
    searchParams.get("brandId")?.split(",").filter(Boolean) || []
  )
  const [selectedConditions, setSelectedConditions] = React.useState<string[]>(
    searchParams.get("condition")?.split(",").filter(Boolean) || []
  )
  const [selectedBattery, setSelectedBattery] = React.useState<number | null>(
    searchParams.get("minBatteryHealth") ? parseInt(searchParams.get("minBatteryHealth")!) : null
  )
  const [selectedRam, setSelectedRam] = React.useState<number[]>(
    searchParams.get("ramGb")?.split(",").map(Number).filter(Boolean) || []
  )
  const [selectedStorage, setSelectedStorage] = React.useState<number[]>(
    searchParams.get("storageGb")?.split(",").map(Number).filter(Boolean) || []
  )
  const [minPrice, setMinPrice] = React.useState(searchParams.get("minPrice") || "")
  const [maxPrice, setMaxPrice] = React.useState(searchParams.get("maxPrice") || "")
  const [sortBy, setSortBy] = React.useState(searchParams.get("sortBy") || "createdAt")
  const [sortOrder, setSortOrder] = React.useState(searchParams.get("sortOrder") || "desc")

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set("search", search)
        if (selectedBrands.length) params.set("brandId", selectedBrands.join(","))
        if (selectedConditions.length) params.set("condition", selectedConditions.join(","))
        if (selectedBattery) params.set("minBatteryHealth", selectedBattery.toString())
        if (selectedRam.length) params.set("ramGb", selectedRam.join(","))
        if (selectedStorage.length) params.set("storageGb", selectedStorage.join(","))
        if (minPrice) params.set("minPrice", minPrice)
        if (maxPrice) params.set("maxPrice", maxPrice)
        params.set("sortBy", sortBy)
        params.set("sortOrder", sortOrder)

        const [productsRes, brandsRes] = await Promise.all([
          fetch(`/api/products?${params.toString()}`),
          fetch("/api/brands"),
        ])

        const productsData = await productsRes.json()
        const brandsData = await brandsRes.json()

        setProducts(productsData.products || [])
        setPagination(productsData.pagination || null)
        setBrands(brandsData.brands || [])
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [search, selectedBrands, selectedConditions, selectedBattery, selectedRam, selectedStorage, minPrice, maxPrice, sortBy, sortOrder])

  const hasActiveFilters =
    search ||
    selectedBrands.length > 0 ||
    selectedConditions.length > 0 ||
    selectedBattery !== null ||
    selectedRam.length > 0 ||
    selectedStorage.length > 0 ||
    minPrice ||
    maxPrice

  const activeFilterCount = [
    selectedBrands.length > 0,
    selectedConditions.length > 0,
    selectedBattery !== null,
    selectedRam.length > 0,
    selectedStorage.length > 0,
    Boolean(minPrice || maxPrice),
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-background border-b sticky top-16 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Sản phẩm</h1>
              <p className="text-muted-foreground text-sm">
                {pagination ? `${pagination.total.toLocaleString("vi-VN")} sản phẩm` : "Đang tải..."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="hidden sm:flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [by, order] = e.target.value.split("-")
                  setSortBy(by)
                  setSortOrder(order)
                }}
                className="border rounded-lg px-3 py-2 text-sm bg-background hidden lg:block"
              >
                <option value="createdAt-desc">Mới nhất</option>
                <option value="createdAt-asc">Cũ nhất</option>
                <option value="price-asc">Giá: Thấp - Cao</option>
                <option value="price-desc">Giá: Cao - Thấp</option>
                <option value="viewCount-desc">Phổ biến nhất</option>
              </select>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden relative">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Bộ lọc</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                    <FilterSidebar
                      brands={brands}
                      selectedBrands={selectedBrands}
                      setSelectedBrands={setSelectedBrands}
                      selectedConditions={selectedConditions}
                      setSelectedConditions={setSelectedConditions}
                      selectedBattery={selectedBattery}
                      setSelectedBattery={setSelectedBattery}
                      selectedRam={selectedRam}
                      setSelectedRam={setSelectedRam}
                      selectedStorage={selectedStorage}
                      setSelectedStorage={setSelectedStorage}
                      minPrice={minPrice}
                      setMinPrice={setMinPrice}
                      maxPrice={maxPrice}
                      setMaxPrice={setMaxPrice}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedBrands.map(brandId => {
                const brand = brands.find(b => b.id === brandId)
                return brand && (
                  <Badge key={brandId} variant="secondary" className="gap-1 pl-2 pr-1">
                    {brand.name}
                    <button
                      onClick={() => setSelectedBrands(selectedBrands.filter(id => id !== brandId))}
                      className="ml-1 hover:bg-muted rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
              {selectedConditions.map(condition => {
                const cond = conditions.find(c => c.value === condition)
                return cond && (
                  <Badge key={condition} variant="secondary" className="gap-1 pl-2 pr-1">
                    {cond.label}
                    <button
                      onClick={() => setSelectedConditions(selectedConditions.filter(c => c !== condition))}
                      className="ml-1 hover:bg-muted rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
              {selectedRam.map(ram => (
                <Badge key={ram} variant="secondary" className="gap-1 pl-2 pr-1">
                  {ram}GB RAM
                  <button
                    onClick={() => setSelectedRam(selectedRam.filter(r => r !== ram))}
                    className="ml-1 hover:bg-muted rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedStorage.map(storage => (
                <Badge key={storage} variant="secondary" className="gap-1 pl-2 pr-1">
                  {storage >= 1024 ? `${storage / 1024}TB` : `${storage}GB`}
                  <button
                    onClick={() => setSelectedStorage(selectedStorage.filter(s => s !== storage))}
                    className="ml-1 hover:bg-muted rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-36 bg-background rounded-2xl border p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Bộ lọc
              </h2>
              <FilterSidebar
                brands={brands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                selectedConditions={selectedConditions}
                setSelectedConditions={setSelectedConditions}
                selectedBattery={selectedBattery}
                setSelectedBattery={setSelectedBattery}
                selectedRam={selectedRam}
                setSelectedRam={setSelectedRam}
                selectedStorage={selectedStorage}
                setSelectedStorage={setSelectedStorage}
                minPrice={minPrice}
                setMinPrice={setMinPrice}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
              />
            </div>
          </aside>

          <div className="flex-1">
            {loading ? (
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "space-y-4"
              )}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Smartphone className="h-10 w-10 text-muted-foreground" />}
                title="Không tìm thấy sản phẩm"
                description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("")
                      setSelectedBrands([])
                      setSelectedConditions([])
                      setSelectedBattery(null)
                      setSelectedRam([])
                      setSelectedStorage([])
                      setMinPrice("")
                      setMaxPrice("")
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                }
              />
            ) : (
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "space-y-4"
              )}>
                {products.map((product, index) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className={cn(
                      "group bg-background border rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 animate-fade-up",
                      viewMode === "list" && "flex"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className={cn(
                      "bg-muted/50 relative overflow-hidden",
                      viewMode === "grid" ? "aspect-square" : "w-48 h-48 shrink-0"
                    )}>
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Smartphone className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <Badge className="bg-background/90 backdrop-blur text-foreground text-xs font-medium shadow-sm">
                          {product.brand.name}
                        </Badge>
                      </div>

                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="text-xs">
                          {product.condition.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    <div className={cn("p-4 flex flex-col", viewMode === "list" && "flex-1")}>
                      <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>

                      <p className="text-xs text-muted-foreground mb-3">
                        {product.ramGb}GB / {product.storageGb}GB • Pin {product.batteryHealth}%
                      </p>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-primary">
                          {Number(product.price).toLocaleString("vi-VN")}đ
                        </span>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-medium">
                            {product.seller.sellerStats?.avgRating
                              ? Number(product.seller.sellerStats.avgRating).toFixed(1)
                              : "Mới"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-3 border-t">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {product.seller.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{product.seller.name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => router.push(`?page=${pagination.page - 1}`)}
                  disabled={pagination.page === 1}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === pagination.totalPages || Math.abs(page - pagination.page) <= 1)
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={pagination.page === page ? "default" : "outline"}
                          onClick={() => router.push(`?page=${page}`)}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(`?page=${pagination.page + 1}`)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductsLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-background border-b sticky top-16 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Sản phẩm</h1>
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  )
}
