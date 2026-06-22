import Link from "next/link"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ShieldCheck, Star, Truck, Headphones, Smartphone, Tablet, Zap, Award, Users, ArrowRight, CheckCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DirectionalTransition } from "@/components/shared/directional-transition"

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
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Star,
    title: "Đánh giá thật",
    description: "Hệ thống đánh giá minh bạch từ người mua",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: Truck,
    title: "Giao hàng nhanh",
    description: "Giao hàng trong 24-48h toàn quốc",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ 24/7",
    description: "Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ",
    color: "bg-purple-500/10 text-purple-600",
  },
]

const stats = [
  { value: "50K+", label: "Người dùng", icon: Users },
  { value: "100K+", label: "Sản phẩm", icon: Package },
  { value: "98%", label: "Hài lòng", icon: Star },
  { value: "4.9", label: "Điểm TB", icon: Award },
]

export default async function HomePage() {
  const session = await auth()
  const [products, categories, brands] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getBrands(),
  ])

  return (
    <DirectionalTransition>
      <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1920&q=80"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/40" />
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        {/* Floating Badge */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 animate-fade-in hidden md:block">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5 shadow-xl">
            <p className="text-white/90 text-sm font-medium flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Hệ thống kiểm tra chất lượng 10 bước
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32 lg:py-40 relative z-10">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full text-sm mb-8 animate-fade-up">
              <Zap className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              <span className="text-white/90">Ưu đãi giảm giá 20% cho thành viên mới</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white animate-fade-up text-balance">
              Mua bán điện thoại
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Chất lượng &amp; Giá tốt
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed animate-fade-up">
              Thị trường mua bán điện thoại cũ hàng đầu Việt Nam với hệ thống kiểm tra chất lượng minh bạch, giá cả hợp lý và chế độ bảo hành.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 animate-fade-up">
              <Link href="/products" transitionTypes={["nav-forward"]}>
                <Button size="lg" className="bg-white text-slate-900 hover:bg-blue-50 shadow-2xl shadow-primary/30 h-12 px-8 font-semibold group">
                  <Smartphone className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Khám phá sản phẩm
                </Button>
              </Link>
              {!session && (
                <Link href="/auth/register" transitionTypes={["nav-forward"]}>
                  <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 h-12 px-8 font-semibold">
                    Đăng ký ngay
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 mt-10 animate-fade-up">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-400" aria-hidden="true" />
                <span className="text-sm text-slate-300">Kiểm tra chất lượng</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-400" aria-hidden="true" />
                <span className="text-sm text-slate-300">Giao hàng nhanh</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <span className="text-sm text-slate-300">Đánh giá thật</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Mockup Image on Right Side */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full hidden lg:block pointer-events-none z-10">
          <div className="relative w-full h-full">
            <Image
              src="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80"
              alt="Premium smartphones"
              fill
              className="object-contain object-center"
            />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-background border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-2">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl md:text-3xl font-bold tabular">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="hover:shadow-md transition-all duration-200 animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-5">
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
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
                <h2 className="text-2xl font-bold text-balance">Danh mục</h2>
                <p className="text-muted-foreground text-sm mt-1">Tìm kiếm theo nhu cầu của bạn</p>
              </div>
              <Link href="/categories" transitionTypes={["nav-forward"]} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category, index) => {
                const Icon = categoryIcons[category.name] || Smartphone
                return (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    transitionTypes={["nav-forward"]}
                    className="group p-6 bg-background border rounded-2xl hover:shadow-lg hover:border-primary/30 transition-all text-center animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-8 w-8 text-primary group-hover:text-primary-foreground" />
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
                <h2 className="text-2xl font-bold text-balance">Thương hiệu</h2>
                <p className="text-muted-foreground text-sm mt-1">Các thương hiệu nổi tiếng</p>
              </div>
              <Link href="/brands" transitionTypes={["nav-forward"]} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {brands.map((brand, index) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  transitionTypes={["nav-forward"]}
                  className="group p-4 bg-background border rounded-xl hover:shadow-md hover:border-primary/30 transition-all text-center animate-fade-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="h-12 mx-auto mb-2 flex items-center justify-center">
                    {brand.logo ? (
                      <Image src={brand.logo} alt={brand.name} width={48} height={48} className="object-contain" />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
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
                <h2 className="text-2xl font-bold text-balance">Sản phẩm nổi bật</h2>
                <p className="text-muted-foreground text-sm mt-1">Những sản phẩm được quan tâm nhiều nhất</p>
              </div>
              <Link href="/products" transitionTypes={["nav-forward"]} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  transitionTypes={["nav-forward"]}
                  className="group bg-background border rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="aspect-square bg-muted/50 relative overflow-hidden">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Smartphone className="h-16 w-16 text-muted-foreground" />
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

                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>

                    <p className="text-xs text-muted-foreground mb-3">
                      {product.ramGb}GB / {product.storageGb}GB
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold text-primary tabular">
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

                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {product.seller.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">{product.seller.name}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto py-16">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Chưa có sản phẩm nào</h3>
              <p className="text-muted-foreground mb-6">
                Hãy là người đầu tiên đăng sản phẩm trên EUT Marketplace
              </p>
              {session?.user?.role === "SELLER" && session?.user?.sellerStatus === "APPROVED" ? (
                <Link href="/seller/products/new" transitionTypes={["nav-forward"]}>
                  <Button>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Đăng sản phẩm mới
                  </Button>
                </Link>
              ) : (
                <Link href="/products" transitionTypes={["nav-forward"]}>
                  <Button>Khám phá ngay</Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Trust Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80"
            alt=""
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/95 via-slate-50/90 to-slate-50/95" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur border border-primary/20 rounded-full text-sm text-primary mb-4">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Cam kết của chúng tôi</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 text-balance">
              Tại sao chọn EUT Marketplace?
            </h2>
            <p className="text-muted-foreground text-lg">
              Chúng tôi cam kết mang đến trải nghiệm mua bán điện thoại tốt nhất với sự minh bạch và uy tín.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Kiểm tra chất lượng</h3>
              <p className="text-muted-foreground leading-relaxed">
                10 bước kiểm tra toàn diện giúp bạn yên tâm về chất lượng sản phẩm trước khi mua.
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Người bán uy tín</h3>
              <p className="text-muted-foreground leading-relaxed">
                Hệ thống Trust Score giúp bạn đánh giá và lựa chọn người bán đáng tin cậy.
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Thanh toán an toàn</h3>
              <p className="text-muted-foreground leading-relaxed">
                Thanh toán qua ngân hàng trực tuyến an toàn, bảo mật. Hoàn tiền nếu sản phẩm không đúng mô tả.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      {!session && (
        <section className="relative py-24 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1920&q=80"
              alt=""
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-900/70" />
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-2xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm mb-6">
                <span className="text-yellow-400">&#9733;</span>
                <span className="text-white/90">Ưu đãi đặc biệt cho người bán</span>
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white leading-tight">
                Bạn có điện thoại cũ?
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Bán ngay hôm nay!
                </span>
              </h2>

              <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto leading-relaxed">
                Đăng bán ngay trên EUT Marketplace, kiểm tra chất lượng miễn phí và nhận giá tốt nhất thị trường.
              </p>

              <div className="flex flex-wrap gap-4 justify-center mb-12">
                <Link href="/auth/register" transitionTypes={["nav-forward"]}>
                  <Button size="lg" className="bg-white text-slate-900 hover:bg-blue-50 shadow-2xl h-14 px-10 font-semibold group">
                    <Smartphone className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    Bắt đầu ngay
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/products" transitionTypes={["nav-forward"]}>
                  <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 h-14 px-8 font-semibold">
                    Tìm hiểu thêm
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                  <span>Đăng tin miễn phí</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-400" aria-hidden="true" />
                  <span>Kiểm tra chất lượng miễn phí</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-400" aria-hidden="true" />
                  <span>Hỗ trợ vận chuyển</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
    </DirectionalTransition>
  )
}
