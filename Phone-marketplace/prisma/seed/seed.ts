import { PrismaClient, ProductCondition } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // ============================================================
  // Create Admin User
  // ============================================================
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
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
  console.log("✅ Created admin user")

  // ============================================================
  // Create Brands
  // ============================================================
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: "apple" },
      update: {},
      create: {
        name: "Apple",
        slug: "apple",
        logo: "https://res.cloudinary.com/demo/image/upload/v1/brands/apple.png",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "samsung" },
      update: {},
      create: {
        name: "Samsung",
        slug: "samsung",
        logo: "https://res.cloudinary.com/demo/image/upload/v1/brands/samsung.png",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "xiaomi" },
      update: {},
      create: {
        name: "Xiaomi",
        slug: "xiaomi",
        logo: "https://res.cloudinary.com/demo/image/upload/v1/brands/xiaomi.png",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "oppo" },
      update: {},
      create: {
        name: "OPPO",
        slug: "oppo",
        logo: "https://res.cloudinary.com/demo/image/upload/v1/brands/oppo.png",
      },
    }),
  ])
  console.log("✅ Created brands")

  // ============================================================
  // Create Phone Models
  // ============================================================
  const [apple, samsung, xiaomi, oppo] = brands

  const phoneModels = await Promise.all([
    // Apple
    prisma.phoneModel.upsert({
      where: { slug: "iphone-15-pro-max" },
      update: {},
      create: {
        brandId: apple.id,
        name: "iPhone 15 Pro Max",
        slug: "iphone-15-pro-max",
        releaseYear: 2023,
        defaultRam: [8],
        defaultStorage: [256, 512, 1024],
        basePrice: 34990000,
      },
    }),
    prisma.phoneModel.upsert({
      where: { slug: "iphone-15-pro" },
      update: {},
      create: {
        brandId: apple.id,
        name: "iPhone 15 Pro",
        slug: "iphone-15-pro",
        releaseYear: 2023,
        defaultRam: [8],
        defaultStorage: [128, 256, 512],
        basePrice: 28990000,
      },
    }),
    prisma.phoneModel.upsert({
      where: { slug: "iphone-15" },
      update: {},
      create: {
        brandId: apple.id,
        name: "iPhone 15",
        slug: "iphone-15",
        releaseYear: 2023,
        defaultRam: [6],
        defaultStorage: [128, 256, 512],
        basePrice: 22990000,
      },
    }),
    prisma.phoneModel.upsert({
      where: { slug: "iphone-14-pro-max" },
      update: {},
      create: {
        brandId: apple.id,
        name: "iPhone 14 Pro Max",
        slug: "iphone-14-pro-max",
        releaseYear: 2022,
        defaultRam: [6],
        defaultStorage: [128, 256, 512, 1024],
        basePrice: 28990000,
      },
    }),

    // Samsung
    prisma.phoneModel.upsert({
      where: { slug: "galaxy-s24-ultra" },
      update: {},
      create: {
        brandId: samsung.id,
        name: "Galaxy S24 Ultra",
        slug: "galaxy-s24-ultra",
        releaseYear: 2024,
        defaultRam: [12],
        defaultStorage: [256, 512, 1024],
        basePrice: 29990000,
      },
    }),
    prisma.phoneModel.upsert({
      where: { slug: "galaxy-s24-plus" },
      update: {},
      create: {
        brandId: samsung.id,
        name: "Galaxy S24+",
        slug: "galaxy-s24-plus",
        releaseYear: 2024,
        defaultRam: [12],
        defaultStorage: [256, 512],
        basePrice: 23990000,
      },
    }),
    prisma.phoneModel.upsert({
      where: { slug: "galaxy-z-fold-5" },
      update: {},
      create: {
        brandId: samsung.id,
        name: "Galaxy Z Fold 5",
        slug: "galaxy-z-fold-5",
        releaseYear: 2023,
        defaultRam: [12],
        defaultStorage: [256, 512, 1024],
        basePrice: 39990000,
      },
    }),

    // Xiaomi
    prisma.phoneModel.upsert({
      where: { slug: "xiaomi-14" },
      update: {},
      create: {
        brandId: xiaomi.id,
        name: "Xiaomi 14",
        slug: "xiaomi-14",
        releaseYear: 2024,
        defaultRam: [8, 12],
        defaultStorage: [256, 512],
        basePrice: 16990000,
      },
    }),
    prisma.phoneModel.upsert({
      where: { slug: "redmi-note-13-pro" },
      update: {},
      create: {
        brandId: xiaomi.id,
        name: "Redmi Note 13 Pro",
        slug: "redmi-note-13-pro",
        releaseYear: 2024,
        defaultRam: [8, 12],
        defaultStorage: [128, 256],
        basePrice: 8990000,
      },
    }),

    // OPPO
    prisma.phoneModel.upsert({
      where: { slug: "find-x7-ultra" },
      update: {},
      create: {
        brandId: oppo.id,
        name: "Find X7 Ultra",
        slug: "find-x7-ultra",
        releaseYear: 2024,
        defaultRam: [12, 16],
        defaultStorage: [256, 512],
        basePrice: 22990000,
      },
    }),
  ])
  console.log("✅ Created phone models")

  // ============================================================
  // Create Category
  // ============================================================
  const smartphone = await prisma.category.upsert({
    where: { slug: "smartphone" },
    update: {},
    create: {
      name: "Smartphone",
      slug: "smartphone",
      icon: "smartphone",
    },
  })
  console.log("✅ Created category")

  // ============================================================
  // Create Seller (Approved)
  // ============================================================
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
  console.log("✅ Created seller")

  // ============================================================
  // Create Buyer
  // ============================================================
  const buyerPassword = await bcrypt.hash("buyer123", 12)
  const buyer = await prisma.user.upsert({
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
  console.log("✅ Created buyer")

  // ============================================================
  // Create 10 Sample Products
  // ============================================================
  const products = [
    {
      modelSlug: "iphone-15-pro-max",
      modelName: "iPhone 15 Pro Max 256GB",
      condition: "EXCELLENT" as ProductCondition,
      color: "Titan Blue",
      ram: 8,
      storage: 256,
      batteryHealth: 92,
      price: 24000000,
      images: [
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
        "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800",
      ],
    },
    {
      modelSlug: "iphone-15-pro",
      modelName: "iPhone 15 Pro 128GB",
      condition: "LIKE_NEW" as ProductCondition,
      color: "Titan Black",
      ram: 8,
      storage: 128,
      batteryHealth: 98,
      price: 21000000,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
      ],
    },
    {
      modelSlug: "iphone-15",
      modelName: "iPhone 15 256GB",
      condition: "GOOD" as ProductCondition,
      color: "Pink",
      ram: 6,
      storage: 256,
      batteryHealth: 85,
      price: 15500000,
      images: [
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",
      ],
    },
    {
      modelSlug: "iphone-14-pro-max",
      modelName: "iPhone 14 Pro Max 128GB",
      condition: "EXCELLENT" as ProductCondition,
      color: "Deep Purple",
      ram: 6,
      storage: 128,
      batteryHealth: 90,
      price: 19500000,
      images: [
        "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800",
      ],
    },
    {
      modelSlug: "galaxy-s24-ultra",
      modelName: "Galaxy S24 Ultra 256GB",
      condition: "LIKE_NEW" as ProductCondition,
      color: "Titanium Black",
      ram: 12,
      storage: 256,
      batteryHealth: 97,
      price: 23500000,
      images: [
        "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
      ],
    },
    {
      modelSlug: "galaxy-s24-plus",
      modelName: "Galaxy S24+ 256GB",
      condition: "EXCELLENT" as ProductCondition,
      color: "Titanium Gray",
      ram: 12,
      storage: 256,
      batteryHealth: 93,
      price: 18000000,
      images: [
        "https://images.unsplash.com/photo-1616161560417-66d4db5892ec?w=800",
      ],
    },
    {
      modelSlug: "galaxy-z-fold-5",
      modelName: "Galaxy Z Fold 5 256GB",
      condition: "GOOD" as ProductCondition,
      color: "Phantom Black",
      ram: 12,
      storage: 256,
      batteryHealth: 88,
      price: 28000000,
      images: [
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
      ],
    },
    {
      modelSlug: "xiaomi-14",
      modelName: "Xiaomi 14 256GB",
      condition: "LIKE_NEW" as ProductCondition,
      color: "Black",
      ram: 12,
      storage: 256,
      batteryHealth: 96,
      price: 13500000,
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
      ],
    },
    {
      modelSlug: "redmi-note-13-pro",
      modelName: "Redmi Note 13 Pro 256GB",
      condition: "EXCELLENT" as ProductCondition,
      color: "Midnight Black",
      ram: 12,
      storage: 256,
      batteryHealth: 94,
      price: 6500000,
      images: [
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
      ],
    },
    {
      modelSlug: "find-x7-ultra",
      modelName: "Find X7 Ultra 256GB",
      condition: "GOOD" as ProductCondition,
      color: "Black",
      ram: 16,
      storage: 256,
      batteryHealth: 87,
      price: 17500000,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800",
      ],
    },
  ]

  for (const productData of products) {
    const model = phoneModels.find((m) => m.slug === productData.modelSlug)
    if (!model) continue

    const slug = `${productData.modelSlug}-${Date.now()}`

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        brandId: model.brandId,
        modelId: model.id,
        categoryId: smartphone.id,
        title: productData.modelName,
        slug,
        description: `${productData.modelName} tình trạng ${productData.condition.toLowerCase()}, pin ${productData.batteryHealth}%, máy zin không sửa chữa.`,
        condition: productData.condition,
        ramGb: productData.ram,
        storageGb: productData.storage,
        color: productData.color,
        batteryHealth: productData.batteryHealth,
        price: productData.price,
        negotiable: true,
        status: "ACTIVE",
        viewCount: Math.floor(Math.random() * 100),
        images: {
          create: productData.images.map((url, index) => ({
            url,
            isPrimary: index === 0,
            sortOrder: index,
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
            faceId: model.brandId === apple.id ? "PASS" : "NOT_TESTED",
            fingerprint: "PASS",
            overallStatus: "Tốt",
            notes: "Máy hoạt động tốt, không có lỗi",
          },
        },
      },
    })
    console.log(`✅ Created product: ${product.title}`)
  }

  console.log("🎉 Seed completed!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
