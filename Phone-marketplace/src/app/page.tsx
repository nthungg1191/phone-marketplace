import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ShieldCheck, Star, Truck, Headphones, Smartphone, Tablet, Zap, Award, Users } from "lucide-react"

async function getFeaturedProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: {
        brand: true,
        images: { where: { isPrimary: true }, take: 1 },
        seller: {
          select: { name: true, sellerRank: true, sellerStats: true },
        },
      },
      orderBy: { viewCount: "desc" },
      take: 8,
    })
    return products
  } catch {
    return []
  }
}

async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      take: 6,
    })
    return categories
  } catch {
    return []
  }
}

async function getBrands() {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      take: 8,
    })
    return brands
  } catch {
    return []
  }
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone: Smartphone,
  Tablet: Tablet,
  "Phụ kiện": Headphones,
}

const features = [
  {
    icon: ShieldCheck,
    title: "Kiểm tra chất lượng",
    description: "10 bước kiểm tra toàn diện trước khi bán",
  },
  {
    icon: Star,
    title: "Đánh giá thật",
    description: "Hệ thống đánh giá minh bạch từ người mua",
  },
  {
    icon: Truck,
    title: "Giao hàng nhanh",
    description: "Giao hàng trong 24-48h toàn quốc",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ 24/7",
    description: "Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ",
  },
]

const stats = [
  { value: "50K+", label: "Người dùng", icon: Users },
  { value: "100K+", label: "Sản phẩm", icon: Smartphone },
  { value: "98%", label: "Hài lòng", icon: Star },
  { value: "4.8", label: "Điểm TB", icon: Award },
]

export default async function HomePage() {
  const session = await auth()
  const [products, categories, brands] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getBrands(),
  ])

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "50px 50px",
          }} />
        </div>
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-6">
              <Zap className="h-4 w-4" />
              <span>Hệ thống kiểm tra chất lượng 10 bước</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Mua bán điện thoại
              <br />
              <span className="text-blue-200"> Uy tín & An toàn</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl">
              Thị trường mua bán điện thoại cũ hàng đầu Việt Nam với hệ thống kiểm tra chất lượng minh bạch, 
              giá cả hợp lý và chế độ bảo hành.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                <Smartphone className="h-5 w-5" />
                Khám phá sản phẩm
              </Link>
              {!session && (
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                >
                  Đăng ký ngay
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Danh mục</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Tìm kiếm theo nhu cầu của bạn
                </p>
              </div>
              <Link
                href="/categories"
                className="text-sm font-medium text-primary hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category) => {
                const Icon = categoryIcons[category.name] || Smartphone
                return (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="group p-6 bg-white border rounded-xl hover:shadow-md hover:border-primary/50 transition-all text-center"
                  >
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">{category.name}</h3>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Thương hiệu</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Các thương hiệu nổi tiếng
                </p>
              </div>
              <Link
                href="/brands"
                className="text-sm font-medium text-primary hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="group p-4 bg-white border rounded-xl hover:shadow-md hover:border-primary/50 transition-all text-center"
                >
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="h-10 mx-auto mb-2 object-contain"
                    />
                  ) : (
                    <div className="h-10 flex items-center justify-center mb-2">
                      <Smartphone className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <h3 className="text-sm font-medium truncate">{brand.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {products.length > 0 ? (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Sản phẩm nổi bật</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Những sản phẩm được quan tâm nhiều nhất
                </p>
              </div>
              <Link
                href="/products"
                className="text-sm font-medium text-primary hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group bg-white border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
                >
                  <div className="aspect-square bg-muted/50 relative overflow-hidden">
                    {product.images[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Smartphone className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      {product.brand.name}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.ramGb}GB / {product.storageGb}GB • {product.condition.replace("_", " ")}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {Number(product.price).toLocaleString("vi-VN")}đ
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>
                          {product.seller.sellerStats?.avgRating
                            ? Number(product.seller.sellerStats.avgRating).toFixed(1)
                            : "Mới"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.seller.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto py-12">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Chưa có sản phẩm nào</h3>
              <p className="text-muted-foreground mb-6">
                Hãy là người đầu tiên đăng sản phẩm trên EUT Marketplace
              </p>
              {session?.user?.role === "SELLER" && session?.user?.sellerStatus === "APPROVED" ? (
                <Link
                  href="/seller/products/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Smartphone className="h-4 w-4" />
                  Đăng sản phẩm mới
                </Link>
              ) : (
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Khám phá ngay
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {!session && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Bạn có điện thoại cũ?</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Đăng bán ngay trên EUT Marketplace, kiểm tra chất lượng miễn phí và nhận giá tốt nhất thị trường.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                Bắt đầu ngay
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                Tìm hiểu thêm
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
