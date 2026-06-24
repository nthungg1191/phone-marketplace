import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { Smartphone, ArrowRight, Shield, Truck, RefreshCw, Headphones } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

interface BrandWithCount {
  id: string
  name: string
  slug: string
  logo: string | null
  _count: { products: number }
}

interface FeaturedProduct {
  id: string
  title: string
  slug: string
  price: string
  images: Array<{ url: string }>
  seller: { sellerStats: { avgRating: string } | null }
}

interface FeaturedBrand extends BrandWithCount {
  products: FeaturedProduct[]
}

async function getActiveBrands(): Promise<BrandWithCount[]> {
  try {
    return await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    })
  } catch {
    return []
  }
}

async function getFeaturedBrands(): Promise<FeaturedBrand[]> {
  try {
    const raw = await prisma.brand.findMany({
      where: { isActive: true, products: { some: {} } },
      orderBy: { products: { _count: "desc" } },
      take: 4,
      include: {
        _count: { select: { products: true } },
        products: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            images: { take: 1 },
            seller: { include: { sellerStats: true } },
          },
        },
      },
    })
    return raw.map((b) => ({
      ...b,
      products: b.products.map((p) => ({ ...p, price: p.price.toString() })),
    })) as FeaturedBrand[]
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function FeaturedBrandCard({ brand }: { brand: FeaturedBrand }) {
  const product = brand.products[0]
  const initials = brand.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href={`/products?brand=${brand.slug}`}
      className="group relative bg-white rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt={brand.name}
              width={28}
              height={28}
              className="object-contain"
            />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {brand.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {brand._count.products} sản phẩm
          </p>
        </div>
      </div>

      {/* Product preview */}
      {product && (
        <div className="px-4 pb-4">
          <div className="aspect-[4/3] bg-muted/40 rounded-xl overflow-hidden mb-3">
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.title}
                width={400}
                height={300}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <p className="text-sm font-medium line-clamp-1 mb-1">{product.title}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary tabular-nums">
              {Number(product.price).toLocaleString("vi-VN")}đ
            </span>
            <span className="text-xs text-muted-foreground">
              ★ {product.seller.sellerStats?.avgRating
                ? Number(product.seller.sellerStats.avgRating).toFixed(1)
                : "Mới"}
            </span>
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground group-hover:text-primary transition-colors">
        <span>Xem tất cả sản phẩm</span>
        <ArrowRight className="h-3.5 w-3.5 translate-x-0 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}

function BrandCard({ brand }: { brand: BrandWithCount }) {
  const isAvailable = brand._count.products > 0
  const initials = brand.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href={isAvailable ? `/products?brand=${brand.slug}` : "#"}
      className={`group relative bg-white rounded-2xl border border-border/60 p-5 transition-all duration-300 ${
        isAvailable
          ? "hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
          : "opacity-50 cursor-default"
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt={brand.name}
              width={40}
              height={40}
              className="object-contain"
            />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">{initials}</span>
          )}
        </div>

        <h3 className={`font-semibold text-sm mb-0.5 ${isAvailable ? "group-hover:text-primary transition-colors" : ""}`}>
          {brand.name}
        </h3>

        <p className="text-xs text-muted-foreground">
          {isAvailable ? `${brand._count.products} sản phẩm` : "Sắp ra mắt"}
        </p>
      </div>

      {isAvailable && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" />
      )}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function BrandsPage() {
  const [allBrands, featuredBrands] = await Promise.all([
    getActiveBrands(),
    getFeaturedBrands(),
  ])

  const activeBrands = allBrands.filter((b) => b._count.products > 0)

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/8 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-2xl pointer-events-none" />

        <div className="container mx-auto px-4 py-16 md:py-20 relative">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Hệ thống điện thoại uy tín #1
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-balance">
              Tìm thương hiệu — Tìm điện thoại
            </h1>
            <p className="text-muted-foreground text-lg text-balance">
              Hơn {activeBrands.length} thương hiệu chính hãng, được kiểm định 10+ bước trước khi đến tay bạn
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* ── All Brands ── */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Tất cả thương hiệu</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeBrands.length} thương hiệu đang hoạt động
              </p>
            </div>
          </div>

          {activeBrands.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-border/60">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Chưa có thương hiệu nào</h3>
              <p className="text-muted-foreground text-sm">
                Hệ thống đang cập nhật các thương hiệu mới.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {activeBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          )}
        </section>

        {/* ── Featured Brands (Hôm nay có gì hot) ── */}
        {featuredBrands.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Hôm nay có gì hot</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sản phẩm nổi bật từ các thương hiệu được yêu thích nhất
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredBrands.map((brand) => (
                <FeaturedBrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trust Bar ── */}
        <section className="bg-white rounded-2xl border border-border/60 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            <div className="flex items-center gap-4 p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">100% Chính hãng</div>
                <p className="text-xs text-muted-foreground">Kiểm định nghiêm ngặt</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Truck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Giao hàng toàn quốc</div>
                <p className="text-xs text-muted-foreground">Free ship đơn từ 500k</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Đổi trả trong 7 ngày</div>
                <p className="text-xs text-muted-foreground">Nếu không đúng mô tả</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Hỗ trợ 24/7</div>
                <p className="text-xs text-muted-foreground">Tư vấn qua chat & hotline</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}