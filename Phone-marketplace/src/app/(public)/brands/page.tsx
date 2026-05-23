import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { Smartphone } from "lucide-react"

interface BrandWithCount {
  id: string
  name: string
  slug: string
  logo: string | null
  _count: {
    products: number
  }
}

async function getBrands(): Promise<BrandWithCount[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })
    return brands
  } catch {
    return []
  }
}

async function getPopularBrands(): Promise<BrandWithCount[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      take: 4,
    })
    return brands
  } catch {
    return []
  }
}

const brandColors: Record<string, string> = {
  apple: "bg-zinc-900 text-white",
  samsung: "bg-blue-600 text-white",
  xiaomi: "bg-orange-500 text-white",
  oppo: "bg-green-600 text-white",
  vivo: "bg-blue-500 text-white",
  realme: "bg-yellow-500 text-black",
  nokia: "bg-blue-400 text-white",
  huawei: "bg-red-600 text-white",
  asus: "bg-blue-800 text-white",
  sony: "bg-black text-white",
}

function getBrandColor(name: string): string {
  const lowerName = name.toLowerCase()
  for (const [key, color] of Object.entries(brandColors)) {
    if (lowerName.includes(key)) {
      return color
    }
  }
  return "bg-primary text-primary-foreground"
}

function BrandCard({ brand }: { brand: BrandWithCount }) {
  const initials = brand.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href={`/products?brand=${brand.slug}`}
      className="group relative bg-white rounded-xl border p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200"
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${getBrandColor(
            brand.name
          )} transition-transform group-hover:scale-105`}
        >
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt={brand.name}
              width={48}
              height={48}
              className="object-contain"
            />
          ) : (
            <span className="text-2xl font-bold">{initials}</span>
          )}
        </div>

        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
          {brand.name}
        </h3>

        <p className="text-sm text-muted-foreground">
          {brand._count.products} sản phẩm
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl" />
    </Link>
  )
}

function PopularBrandCard({ brand }: { brand: BrandWithCount }) {
  const initials = brand.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href={`/products?brand=${brand.slug}`}
      className="group relative overflow-hidden rounded-2xl"
    >
      <div
        className={`h-40 flex flex-col items-center justify-center ${getBrandColor(
          brand.name
        )}`}
      >
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt={brand.name}
              width={40}
              height={40}
              className="object-contain brightness-0 invert"
            />
          ) : (
            <span className="text-xl font-bold">{initials}</span>
          )}
        </div>
        <h3 className="font-semibold text-lg">{brand.name}</h3>
        <p className="text-sm opacity-80">
          {brand._count.products} sản phẩm
        </p>
      </div>

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </Link>
  )
}

export default async function BrandsPage() {
  const [brands, popularBrands] = await Promise.all([
    getBrands(),
    getPopularBrands(),
  ])

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Khám phá thương hiệu
            </h1>
            <p className="text-muted-foreground text-lg">
              Tìm kiếm điện thoại yêu thích từ các thương hiệu hàng đầu thế giới
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Popular Brands */}
        {popularBrands.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Thương hiệu nổi bật</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularBrands.map((brand) => (
                <PopularBrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          </section>
        )}

        {/* All Brands */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Tất cả thương hiệu</h2>
            <span className="text-sm text-muted-foreground">
              {brands.length} thương hiệu
            </span>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <Smartphone className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có thương hiệu nào</h3>
              <p className="text-muted-foreground">
                Hệ thống đang cập nhật các thương hiệu mới.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {brands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          )}
        </section>

        {/* Brand Stats */}
        <section className="mt-12 bg-white rounded-xl border p-8">
          <h2 className="text-xl font-bold mb-6 text-center">
            Tại sao chọn EUT Marketplace?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">
                {brands.length}+
              </div>
              <p className="text-sm text-muted-foreground">Thương hiệu</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">
                {brands.reduce((acc, b) => acc + b._count.products, 0)}+
              </div>
              <p className="text-sm text-muted-foreground">Sản phẩm</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">10+</div>
              <p className="text-sm text-muted-foreground">Bước kiểm tra</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">100%</div>
              <p className="text-sm text-muted-foreground">Chính hãng</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
