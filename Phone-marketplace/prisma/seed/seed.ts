import { PrismaClient, ProductCondition } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting seed...")

  // Create Admin User
  const adminPassword = await bcrypt.hash("admin123", 12)
  await prisma.user.upsert({
    where: { email: "admin@eutmarket.vn" },
    update: {},
    create: {
      email: "admin@eutmarket.vn",
      password: adminPassword,
      name: "Administrator",
      role: "ADMIN",
      isVerified: true,
      sellerStatus: "NONE",
    },
  })
  console.log("Created admin user")

  // Create Brands
  const brandData = [
    { name: "Apple", slug: "apple", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Meta-Logo.png/48px-Meta-Logo.png" },
    { name: "Samsung", slug: "samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/100px-Samsung_Logo.svg.png" },
    { name: "Xiaomi", slug: "xiaomi", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Xiaomi_logo_%282021-%29.svg/100px-Xiaomi_logo_%282021-%29.svg.png" },
    { name: "OPPO", slug: "oppo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/OPPO_LOGO_2019.svg/100px-OPPO_LOGO_2019.svg.png" },
    { name: "Vivo", slug: "vivo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Vivo_logo_2019.svg/100px-Vivo_logo_2019.svg.png" },
    { name: "Realme", slug: "realme", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Realme_logo.svg/100px-Realme_logo.svg.png" },
    { name: "Nokia", slug: "nokia", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nokia_original_logo.svg/100px-Nokia_original_logo.svg.png" },
    { name: "Huawei", slug: "huawei", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Huawei_Logo.svg/100px-Huawei_Logo.svg.png" },
  ]

  const brands: Array<{ id: string; slug: string; name: string }> = []
  for (const b of brandData) {
    const created = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    })
    brands.push(created)
  }
  console.log(`Created ${brands.length} brands`)

  const getBrand = (slug: string) => brands.find((b) => b.slug === slug)!

  // Create Phone Models
  const modelData = [
    // Apple
    { brandSlug: "apple", name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", year: 2023, ram: [8], storage: [256, 512, 1024], price: 34990000 },
    { brandSlug: "apple", name: "iPhone 15 Pro", slug: "iphone-15-pro", year: 2023, ram: [8], storage: [128, 256, 512], price: 28990000 },
    { brandSlug: "apple", name: "iPhone 15", slug: "iphone-15", year: 2023, ram: [6], storage: [128, 256, 512], price: 22990000 },
    { brandSlug: "apple", name: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", year: 2022, ram: [6], storage: [128, 256, 512, 1024], price: 28990000 },
    { brandSlug: "apple", name: "iPhone 14", slug: "iphone-14", year: 2022, ram: [6], storage: [128, 256, 512], price: 18990000 },
    // Samsung
    { brandSlug: "samsung", name: "Galaxy S24 Ultra", slug: "galaxy-s24-ultra", year: 2024, ram: [12], storage: [256, 512, 1024], price: 29990000 },
    { brandSlug: "samsung", name: "Galaxy S24+", slug: "galaxy-s24-plus", year: 2024, ram: [12], storage: [256, 512], price: 23990000 },
    { brandSlug: "samsung", name: "Galaxy Z Fold 5", slug: "galaxy-z-fold-5", year: 2023, ram: [12], storage: [256, 512, 1024], price: 39990000 },
    { brandSlug: "samsung", name: "Galaxy A55", slug: "galaxy-a55", year: 2024, ram: [8], storage: [128, 256], price: 9990000 },
    // Xiaomi
    { brandSlug: "xiaomi", name: "Xiaomi 14", slug: "xiaomi-14", year: 2024, ram: [8, 12], storage: [256, 512], price: 16990000 },
    { brandSlug: "xiaomi", name: "Redmi Note 13 Pro", slug: "redmi-note-13-pro", year: 2024, ram: [8, 12], storage: [128, 256], price: 8990000 },
    { brandSlug: "xiaomi", name: "POCO F6", slug: "poco-f6", year: 2024, ram: [8, 12], storage: [256, 512], price: 10990000 },
    // OPPO
    { brandSlug: "oppo", name: "Find X7 Ultra", slug: "find-x7-ultra", year: 2024, ram: [12, 16], storage: [256, 512], price: 22990000 },
    { brandSlug: "oppo", name: "Reno 11F", slug: "reno-11-f", year: 2024, ram: [8], storage: [128, 256], price: 8990000 },
    // Vivo
    { brandSlug: "vivo", name: "Vivo V30 Pro", slug: "vivo-v30-pro", year: 2024, ram: [12], storage: [256, 512], price: 14990000 },
    { brandSlug: "vivo", name: "Vivo V30e", slug: "vivo-v30e", year: 2024, ram: [8], storage: [128, 256], price: 7990000 },
    // Realme
    { brandSlug: "realme", name: "Realme GT Neo 6", slug: "realme-gt-neo-6", year: 2024, ram: [8, 12, 16], storage: [128, 256, 512], price: 7990000 },
    { brandSlug: "realme", name: "Realme C65", slug: "realme-c65", year: 2024, ram: [4, 6, 8], storage: [64, 128], price: 3990000 },
    // Nokia
    { brandSlug: "nokia", name: "Nokia G42", slug: "nokia-g42", year: 2023, ram: [4, 6], storage: [128], price: 3990000 },
    // Huawei
    { brandSlug: "huawei", name: "Huawei Nova 12i", slug: "huawei-nova-12i", year: 2024, ram: [8], storage: [128, 256], price: 6990000 },
  ]

  const phoneModels: Array<{ id: string; slug: string; brandId: string }> = []
  for (const m of modelData) {
    const brand = getBrand(m.brandSlug)
    const created = await prisma.phoneModel.upsert({
      where: { slug: m.slug },
      update: {},
      create: {
        brandId: brand.id,
        name: m.name,
        slug: m.slug,
        releaseYear: m.year,
        defaultRam: m.ram,
        defaultStorage: m.storage,
        basePrice: m.price,
      },
    })
    phoneModels.push(created)
  }
  console.log(`Created ${phoneModels.length} phone models`)

  // Create Categories
  const catData = [
    { name: "Smartphone", slug: "smartphone", icon: "smartphone" },
    { name: "Tablet", slug: "tablet", icon: "tablet" },
    { name: "Phụ kiện", slug: "accessory", icon: "headphones" },
  ]

  const categories: Array<{ id: string; slug: string }> = []
  for (const c of catData) {
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    })
    categories.push(created)
  }
  console.log(`Created ${categories.length} categories`)

  const smartphoneCat = categories.find((c) => c.slug === "smartphone")!

  // Create Seller (Approved)
  const sellerPassword = await bcrypt.hash("seller123", 12)
  const seller = await prisma.user.upsert({
    where: { email: "seller@eutmarket.vn" },
    update: {},
    create: {
      email: "seller@eutmarket.vn",
      password: sellerPassword,
      name: "Nguyễn Văn Seller",
      phone: "0901234567",
      role: "SELLER",
      isVerified: true,
      sellerStatus: "APPROVED",
      sellerApprovedAt: new Date(),
      sellerRank: "TRUSTED",
      sellerStats: {
        create: {
          totalTransactions: 25,
          successfulDeals: 23,
          cancelledDeals: 2,
          totalRevenue: 450000000,
          avgResponseTimeMin: 30,
          avgRating: 4.5,
          totalReviews: 20,
          successRate: 92,
          isIdentityVerified: true,
        },
      },
    },
  })
  console.log("Created seller")

  // Create Buyer
  const buyerPassword = await bcrypt.hash("buyer123", 12)
  await prisma.user.upsert({
    where: { email: "buyer@eutmarket.vn" },
    update: {},
    create: {
      email: "buyer@eutmarket.vn",
      password: buyerPassword,
      name: "Trần Thị Buyer",
      phone: "0907654321",
      role: "BUYER",
      isVerified: true,
      sellerStatus: "NONE",
    },
  })
  console.log("Created buyer")

  // Create 10 Sample Products
  const productSamples = [
    { modelSlug: "iphone-15-pro-max", title: "iPhone 15 Pro Max 256GB Titan Blue", condition: "EXCELLENT" as ProductCondition, color: "Titan Blue", ram: 8, storage: 256, battery: 92, price: 24000000, images: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800", "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800"] },
    { modelSlug: "iphone-15-pro", title: "iPhone 15 Pro 128GB Titan Black", condition: "LIKE_NEW" as ProductCondition, color: "Titan Black", ram: 8, storage: 128, battery: 98, price: 21000000, images: ["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"] },
    { modelSlug: "iphone-15", title: "iPhone 15 256GB Pink", condition: "GOOD" as ProductCondition, color: "Pink", ram: 6, storage: 256, battery: 85, price: 15500000, images: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"] },
    { modelSlug: "galaxy-s24-ultra", title: "Galaxy S24 Ultra 256GB Titanium Black", condition: "LIKE_NEW" as ProductCondition, color: "Titanium Black", ram: 12, storage: 256, battery: 97, price: 23500000, images: ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800"] },
    { modelSlug: "galaxy-s24-plus", title: "Galaxy S24+ 256GB Titanium Gray", condition: "EXCELLENT" as ProductCondition, color: "Titanium Gray", ram: 12, storage: 256, battery: 93, price: 18000000, images: ["https://images.unsplash.com/photo-1616161560417-66d4db5892ec?w=800"] },
    { modelSlug: "xiaomi-14", title: "Xiaomi 14 256GB Black", condition: "LIKE_NEW" as ProductCondition, color: "Black", ram: 12, storage: 256, battery: 96, price: 13500000, images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"] },
    { modelSlug: "redmi-note-13-pro", title: "Redmi Note 13 Pro 256GB Midnight Black", condition: "EXCELLENT" as ProductCondition, color: "Midnight Black", ram: 12, storage: 256, battery: 94, price: 6500000, images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"] },
    { modelSlug: "find-x7-ultra", title: "Find X7 Ultra 256GB Black", condition: "GOOD" as ProductCondition, color: "Black", ram: 16, storage: 256, battery: 87, price: 17500000, images: ["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"] },
    { modelSlug: "realme-gt-neo-6", title: "Realme GT Neo 6 256GB Silver", condition: "EXCELLENT" as ProductCondition, color: "Silver", ram: 12, storage: 256, battery: 95, price: 7500000, images: ["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"] },
    { modelSlug: "vivo-v30-pro", title: "Vivo V30 Pro 256GB Flowing Gold", condition: "LIKE_NEW" as ProductCondition, color: "Flowing Gold", ram: 12, storage: 256, battery: 97, price: 12000000, images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"] },
  ]

  for (let i = 0; i < productSamples.length; i++) {
    const p = productSamples[i]
    const model = phoneModels.find((m) => m.slug === p.modelSlug)
    if (!model) continue

    const slug = `${p.modelSlug}-${Date.now()}-${i}`
    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        brandId: model.brandId,
        modelId: model.id,
        categoryId: smartphoneCat.id,
        title: p.title,
        slug,
        description: `${p.title}, pin ${p.battery}%, máy zin chưa sửa chữa, đầy đủ phụ kiện.`,
        condition: p.condition,
        ramGb: p.ram,
        storageGb: p.storage,
        color: p.color,
        batteryHealth: p.battery,
        price: p.price,
        negotiable: true,
        status: "ACTIVE",
        viewCount: Math.floor(Math.random() * 500) + 50,
        images: {
          create: p.images.map((url, idx) => ({
            url,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        },
        healthCheck: {
          create: {
            screen: "PASS",
            cameraFront: "PASS",
            cameraBack: "PASS",
            speaker: "PASS",
            microphone: "PASS",
            buttons: "PASS",
            wifi: "PASS",
            bluetooth: "PASS",
            chargingPort: "PASS",
            faceId: model.brandId === getBrand("apple").id ? "PASS" : "NOT_TESTED",
            fingerprint: "PASS",
            overallStatus: "Tốt",
            notes: "Máy hoạt động tốt, không lỗi, pin khỏe.",
          },
        },
      },
    })
    console.log(`Created product: ${product.title}`)
  }

  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
