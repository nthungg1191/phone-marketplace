import { PrismaClient, ProductCondition, WarrantyType, HealthCheckStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const PASS: HealthCheckStatus = "PASS"
const NOT_TESTED: HealthCheckStatus = "NOT_TESTED"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting seed...")

  // Create Admin User
  const adminPassword = await bcrypt.hash("admin123", 12)
  await prisma.user.upsert({
    where: { email: "admin.hnt@gmail.com" },
    update: {},
    create: {
      email: "admin.hnt@gmail.com",
      password: adminPassword,
      name: "Administrator",
      role: "ADMIN",
      isVerified: true,
      sellerStatus: "NONE",
    },
  })
    console.log("✅ Created admin user (admin.hnt@gmail.com / admin123)")

  // Create Brands
  const brandData = [
    { name: "Apple", slug: "apple", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camdemojisvgapple.svg/48px-Camdemojisvgapple.svg.png" },
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
  console.log(`✅ Created ${brands.length} brands`)

  const getBrand = (slug: string) => brands.find((b) => b.slug === slug)!

  // Create Phone Models - iPhone (more detailed)
  const modelData = [
    // Apple - iPhones
    { brandSlug: "apple", name: "iPhone 16 Pro Max", slug: "iphone-16-pro-max", year: 2024, ram: [8], storage: [256, 512, 1024], price: 39990000 },
    { brandSlug: "apple", name: "iPhone 16 Pro", slug: "iphone-16-pro", year: 2024, ram: [8], storage: [128, 256, 512], price: 32990000 },
    { brandSlug: "apple", name: "iPhone 16", slug: "iphone-16", year: 2024, ram: [8], storage: [128, 256, 512], price: 22990000 },
    { brandSlug: "apple", name: "iPhone 16e", slug: "iphone-16e", year: 2025, ram: [8], storage: [128, 256], price: 16990000 },
    { brandSlug: "apple", name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", year: 2023, ram: [8], storage: [256, 512, 1024], price: 29990000 },
    { brandSlug: "apple", name: "iPhone 15 Pro", slug: "iphone-15-pro", year: 2023, ram: [8], storage: [128, 256, 512], price: 24990000 },
    { brandSlug: "apple", name: "iPhone 15", slug: "iphone-15", year: 2023, ram: [6], storage: [128, 256, 512], price: 19990000 },
    { brandSlug: "apple", name: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", year: 2022, ram: [6], storage: [128, 256, 512, 1024], price: 24990000 },
    { brandSlug: "apple", name: "iPhone 14 Pro", slug: "iphone-14-pro", year: 2022, ram: [6], storage: [128, 256, 512], price: 21990000 },
    { brandSlug: "apple", name: "iPhone 14", slug: "iphone-14", year: 2022, ram: [6], storage: [128, 256, 512], price: 16990000 },
    { brandSlug: "apple", name: "iPhone 13 Pro Max", slug: "iphone-13-pro-max", year: 2021, ram: [6], storage: [128, 256, 512], price: 17990000 },
    { brandSlug: "apple", name: "iPhone 13", slug: "iphone-13", year: 2021, ram: [4], storage: [128, 256], price: 13990000 },
    { brandSlug: "apple", name: "iPhone SE 3", slug: "iphone-se-3", year: 2022, ram: [4], storage: [64, 128, 256], price: 10990000 },
    // Samsung
    { brandSlug: "samsung", name: "Galaxy S25 Ultra", slug: "galaxy-s25-ultra", year: 2025, ram: [12, 16], storage: [256, 512, 1024], price: 34990000 },
    { brandSlug: "samsung", name: "Galaxy S25+", slug: "galaxy-s25-plus", year: 2025, ram: [12], storage: [256, 512], price: 27990000 },
    { brandSlug: "samsung", name: "Galaxy S25", slug: "galaxy-s25", year: 2025, ram: [12], storage: [128, 256], price: 21990000 },
    { brandSlug: "samsung", name: "Galaxy S24 Ultra", slug: "galaxy-s24-ultra", year: 2024, ram: [12], storage: [256, 512, 1024], price: 29990000 },
    { brandSlug: "samsung", name: "Galaxy S24+", slug: "galaxy-s24-plus", year: 2024, ram: [12], storage: [256, 512], price: 23990000 },
    { brandSlug: "samsung", name: "Galaxy Z Fold 6", slug: "galaxy-z-fold-6", year: 2024, ram: [12], storage: [256, 512, 1024], price: 44990000 },
    { brandSlug: "samsung", name: "Galaxy Z Flip 6", slug: "galaxy-z-flip-6", year: 2024, ram: [12], storage: [256, 512], price: 24990000 },
    { brandSlug: "samsung", name: "Galaxy A55", slug: "galaxy-a55", year: 2024, ram: [8], storage: [128, 256], price: 9990000 },
    { brandSlug: "samsung", name: "Galaxy A35", slug: "galaxy-a35", year: 2024, ram: [8], storage: [128, 256], price: 7990000 },
    // Xiaomi
    { brandSlug: "xiaomi", name: "Xiaomi 15 Ultra", slug: "xiaomi-15-ultra", year: 2025, ram: [16], storage: [512, 1024], price: 29990000 },
    { brandSlug: "xiaomi", name: "Xiaomi 15", slug: "xiaomi-15", year: 2025, ram: [12, 16], storage: [256, 512], price: 19990000 },
    { brandSlug: "xiaomi", name: "Xiaomi 14T Pro", slug: "xiaomi-14t-pro", year: 2024, ram: [12], storage: [256, 512], price: 14990000 },
    { brandSlug: "xiaomi", name: "Xiaomi 14", slug: "xiaomi-14", year: 2024, ram: [8, 12], storage: [256, 512], price: 16990000 },
    { brandSlug: "xiaomi", name: "Redmi Note 14 Pro", slug: "redmi-note-14-pro", year: 2024, ram: [8, 12], storage: [128, 256], price: 8990000 },
    { brandSlug: "xiaomi", name: "POCO F7 Ultra", slug: "poco-f7-ultra", year: 2025, ram: [12], storage: [256, 512], price: 13990000 },
    // OPPO
    { brandSlug: "oppo", name: "Find X8 Ultra", slug: "find-x8-ultra", year: 2025, ram: [16], storage: [512, 1024], price: 27990000 },
    { brandSlug: "oppo", name: "Find X8", slug: "find-x8", year: 2025, ram: [12], storage: [256, 512], price: 18990000 },
    { brandSlug: "oppo", name: "Reno 13 Pro", slug: "reno-13-pro", year: 2025, ram: [12], storage: [256, 512], price: 14990000 },
    { brandSlug: "oppo", name: "Reno 12", slug: "reno-12", year: 2024, ram: [8, 12], storage: [256, 512], price: 10990000 },
    { brandSlug: "oppo", name: "OPPO A80", slug: "oppo-a80", year: 2024, ram: [8], storage: [128, 256], price: 5990000 },
    // Vivo
    { brandSlug: "vivo", name: "Vivo X200 Ultra", slug: "vivo-x200-ultra", year: 2025, ram: [16], storage: [512, 1024], price: 26990000 },
    { brandSlug: "vivo", name: "Vivo X200", slug: "vivo-x200", year: 2025, ram: [12], storage: [256, 512], price: 17990000 },
    { brandSlug: "vivo", name: "Vivo V40", slug: "vivo-v40", year: 2024, ram: [8, 12], storage: [256, 512], price: 9990000 },
    { brandSlug: "vivo", name: "Vivo V30", slug: "vivo-v30", year: 2024, ram: [8], storage: [128, 256], price: 7990000 },
    // Realme
    { brandSlug: "realme", name: "Realme GT 7 Pro", slug: "realme-gt-7-pro", year: 2024, ram: [12], storage: [256, 512], price: 13990000 },
    { brandSlug: "realme", name: "Realme 13 Pro+", slug: "realme-13-pro-plus", year: 2024, ram: [8, 12], storage: [256], price: 9990000 },
    { brandSlug: "realme", name: "Realme C75", slug: "realme-c75", year: 2024, ram: [8], storage: [128, 256], price: 4990000 },
    // Nokia
    { brandSlug: "nokia", name: "Nokia G42", slug: "nokia-g42", year: 2023, ram: [4, 6], storage: [128], price: 3990000 },
    { brandSlug: "nokia", name: "Nokia C32", slug: "nokia-c32", year: 2023, ram: [3], storage: [64, 128], price: 2990000 },
    // Huawei
    { brandSlug: "huawei", name: "Huawei Mate 70 Pro", slug: "huawei-mate-70-pro", year: 2024, ram: [12], storage: [256, 512], price: 24990000 },
    { brandSlug: "huawei", name: "Huawei Nova 13", slug: "huawei-nova-13", year: 2024, ram: [8], storage: [256], price: 9990000 },
    { brandSlug: "huawei", name: "Huawei Pura 70", slug: "huawei-pura-70", year: 2024, ram: [12], storage: [256, 512], price: 17990000 },
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
  console.log(`✅ Created ${phoneModels.length} phone models`)

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
  console.log(`✅ Created ${categories.length} categories`)

  const smartphoneCat = categories.find((c) => c.slug === "smartphone")!
  const isApple = (brandSlug: string) => brandSlug === "apple"

  // Create Seller 1 (Trusted)
  const seller1Password = await bcrypt.hash("seller123", 12)
  const seller1 = await prisma.user.upsert({
    where: { email: "seller.hnt@gmail.com" },
    update: {},
    create: {
      email: "seller.hnt@gmail.com",
      password: seller1Password,
      name: "Nguyễn Văn Seller",
      phone: "0901234567",
      role: "SELLER",
      isVerified: true,
      sellerStatus: "APPROVED",
      sellerApprovedAt: new Date(),
      sellerRank: "TRUSTED",
      sellerStats: {
        create: {
          totalTransactions: 125,
          successfulDeals: 118,
          cancelledDeals: 7,
          totalRevenue: 2500000000,
          avgResponseTimeMin: 15,
          avgRating: 4.8,
          totalReviews: 98,
          successRate: 94,
          isIdentityVerified: true,
        },
      },
    },
  })
    console.log("✅ Created seller 1 (seller.hnt@gmail.com / seller123)")

  // Create Seller 2 (New)
  const seller2Password = await bcrypt.hash("seller456", 12)
  const seller2 = await prisma.user.upsert({
    where: { email: "seller2.hnt@gmail.com" },
    update: {},
    create: {
      email: "seller2.hnt@gmail.com",
      password: seller2Password,
      name: "Trần Thị Minh",
      phone: "0912345678",
      role: "SELLER",
      isVerified: true,
      sellerStatus: "APPROVED",
      sellerApprovedAt: new Date(),
      sellerRank: "NEW",
      sellerStats: {
        create: {
          totalTransactions: 12,
          successfulDeals: 10,
          cancelledDeals: 2,
          totalRevenue: 85000000,
          avgResponseTimeMin: 45,
          avgRating: 4.2,
          totalReviews: 8,
          successRate: 83,
          isIdentityVerified: true,
        },
      },
    },
  })
    console.log("✅ Created seller 2 (seller2.hnt@gmail.com / seller456)")

  // Create Buyer
  const buyerPassword = await bcrypt.hash("buyer123", 12)
  await prisma.user.upsert({
    where: { email: "buyer.hnt@gmail.com" },
    update: {},
    create: {
      email: "buyer.hnt@gmail.com",
      password: buyerPassword,
      name: "Trần Thị Buyer",
      phone: "0907654321",
      role: "BUYER",
      isVerified: true,
      sellerStatus: "NONE",
    },
  })
    console.log("✅ Created buyer (buyer.hnt@gmail.com / buyer123)")

  // Create 15 Sample Products with full HealthCheck
  const productSamples = [
    // iPhones with full health check
    { 
      modelSlug: "iphone-15-pro-max", 
      title: "iPhone 15 Pro Max 256GB Titan Blue", 
      condition: "EXCELLENT_98" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Titan Blue", 
      ram: 8, 
      storage: 256, 
      battery: 97, 
      price: 24000000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
        "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800",
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"
      ],
      healthCheck: {
        serialNumber: "DNPX1234ABC",
        wifiMacAddress: "A4:B5:C6:D7:E8:F9",
        bluetoothMacAddress: "A4:B5:C6:D7:E8:F0",
        iosVersion: "17.5",
        activationStatus: "Activated",
        jailbreakStatus: "No Jailbreak",
        securityLockStatus: "Unlocked",
        batteryCycleCount: 145,
        batteryHealth: 97,
        screen: PASS, cameraFront: PASS, cameraBack: PASS,
        speaker: PASS, microphone: PASS, wifi: PASS,
        bluetooth: PASS, fingerprint: NOT_TESTED,
        faceId: PASS, chargingPort: PASS,
        overallStatus: "Excellent",
        notes: "Máy zin 100%, chưa từng sửa chữa, pin khỏe 97%"
      }
    },
    { 
      modelSlug: "iphone-15-pro", 
      title: "iPhone 15 Pro 128GB Titan Black", 
      condition: "PERFECT_99" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Titan Black", 
      ram: 8, 
      storage: 128, 
      battery: 99, 
      price: 22000000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800",
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"
      ],
      healthCheck: {
        serialNumber: "DNQZ5678XYZ",
        wifiMacAddress: "B4:C5:D6:E7:F8:A9",
        bluetoothMacAddress: "B4:C5:D6:E7:F8:A0",
        iosVersion: "17.5.1",
        activationStatus: "Activated",
        jailbreakStatus: "No Jailbreak",
        securityLockStatus: "Unlocked",
        batteryCycleCount: 45,
        batteryHealth: 99,
        screen: PASS, cameraFront: PASS, cameraBack: PASS,
        speaker: PASS, microphone: PASS, wifi: PASS,
        bluetooth: PASS, fingerprint: NOT_TESTED,
        faceId: PASS, chargingPort: PASS,
        overallStatus: "Like New",
        notes: "Máy mới 99%, chưa active, full phụ kiện"
      }
    },
    { 
      modelSlug: "iphone-14-pro", 
      title: "iPhone 14 Pro 256GB Deep Purple", 
      condition: "EXCELLENT_97" as ProductCondition, 
      warranty: "OUT_OF_WARRANTY" as WarrantyType,
      color: "Deep Purple", 
      ram: 6, 
      storage: 256, 
      battery: 89, 
      price: 17500000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"
      ],
      healthCheck: {
        serialNumber: "FL1A2345BCD",
        wifiMacAddress: "C4:D5:E6:F7:A8:B9",
        bluetoothMacAddress: "C4:D5:E6:F7:A8:B0",
        iosVersion: "17.4.1",
        activationStatus: "Activated",
        jailbreakStatus: "No Jailbreak",
        securityLockStatus: "Unlocked",
        batteryCycleCount: 312,
        batteryHealth: 89,
        screen: PASS, cameraFront: PASS, cameraBack: PASS,
        speaker: PASS, microphone: PASS, wifi: PASS,
        bluetooth: PASS, fingerprint: NOT_TESTED,
        faceId: PASS, chargingPort: PASS,
        overallStatus: "Good",
        notes: "Máy đẹp, pin 89%, có vài vết xước nhỏ không thấy được"
      }
    },
    { 
      modelSlug: "iphone-16", 
      title: "iPhone 16 256GB Pink", 
      condition: "LIKE_NEW" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Pink", 
      ram: 8, 
      storage: 256, 
      battery: 100, 
      price: 20000000, 
      sellerId: seller2.id,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800",
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"
      ],
      healthCheck: {
        serialNumber: "G2X1234YZ",
        wifiMacAddress: "D4:E5:F6:A7:B8:C9",
        bluetoothMacAddress: "D4:E5:F6:A7:B8:C0",
        iosVersion: "18.0",
        activationStatus: "Activated",
        jailbreakStatus: "No Jailbreak",
        securityLockStatus: "Unlocked",
        batteryCycleCount: 12,
        batteryHealth: 100,
        screen: PASS, cameraFront: PASS, cameraBack: PASS,
        speaker: PASS, microphone: PASS, wifi: PASS,
        bluetooth: PASS, fingerprint: NOT_TESTED,
        faceId: PASS, chargingPort: PASS,
        overallStatus: "Brand New",
        notes: "Máy mới chưa sử dụng, full box"
      }
    },
    // Samsung products
    { 
      modelSlug: "galaxy-s24-ultra", 
      title: "Galaxy S24 Ultra 256GB Titanium Black", 
      condition: "EXCELLENT_98" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Titanium Black", 
      ram: 12, 
      storage: 256, 
      battery: 96, 
      price: 23500000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800"
      ],
      healthCheck: null
    },
    { 
      modelSlug: "galaxy-s25-ultra", 
      title: "Galaxy S25 Ultra 512GB Titanium Gray", 
      condition: "PERFECT_99" as ProductCondition, 
      warranty: "SELLER_WARRANTY" as WarrantyType,
      color: "Titanium Gray", 
      ram: 12, 
      storage: 512, 
      battery: 98, 
      price: 28900000, 
      sellerId: seller2.id,
      images: [
        "https://images.unsplash.com/photo-1616161560417-66d4db5892ec?w=800"
      ],
      healthCheck: null
    },
    { 
      modelSlug: "galaxy-z-fold-6", 
      title: "Galaxy Z Fold 6 256GB Navy", 
      condition: "EXCELLENT_97" as ProductCondition, 
      warranty: "OUT_OF_WARRANTY" as WarrantyType,
      color: "Navy", 
      ram: 12, 
      storage: 256, 
      battery: 91, 
      price: 35000000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1616161560417-66d4db5892ec?w=800"
      ],
      healthCheck: null
    },
    // Xiaomi products
    { 
      modelSlug: "xiaomi-14", 
      title: "Xiaomi 14 256GB Black", 
      condition: "EXCELLENT_98" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Black", 
      ram: 12, 
      storage: 256, 
      battery: 95, 
      price: 13500000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"
      ],
      healthCheck: null
    },
    { 
      modelSlug: "redmi-note-14-pro", 
      title: "Redmi Note 14 Pro 256GB Midnight Black", 
      condition: "EXCELLENT_97" as ProductCondition, 
      warranty: "SELLER_WARRANTY" as WarrantyType,
      color: "Midnight Black", 
      ram: 8, 
      storage: 256, 
      battery: 94, 
      price: 7500000, 
      sellerId: seller2.id,
      images: [
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"
      ],
      healthCheck: null
    },
    { 
      modelSlug: "poco-f7-ultra", 
      title: "POCO F7 Ultra 256GB Black", 
      condition: "LIKE_NEW" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Black", 
      ram: 12, 
      storage: 256, 
      battery: 99, 
      price: 12000000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"
      ],
      healthCheck: null
    },
    // OPPO products
    { 
      modelSlug: "find-x8", 
      title: "Find X8 256GB Space Black", 
      condition: "EXCELLENT_98" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Space Black", 
      ram: 12, 
      storage: 256, 
      battery: 96, 
      price: 16500000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"
      ],
      healthCheck: null
    },
    { 
      modelSlug: "reno-13-pro", 
      title: "Reno 13 Pro 512GB Ploving Gold", 
      condition: "PERFECT_99" as ProductCondition, 
      warranty: "SELLER_WARRANTY" as WarrantyType,
      color: "Flowing Gold", 
      ram: 12, 
      storage: 512, 
      battery: 98, 
      price: 13000000, 
      sellerId: seller2.id,
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"
      ],
      healthCheck: null
    },
    // Vivo products
    { 
      modelSlug: "vivo-x200", 
      title: "Vivo X200 256GB Cosmos Purple", 
      condition: "EXCELLENT_97" as ProductCondition, 
      warranty: "WITH_WARRANTY" as WarrantyType,
      color: "Cosmos Purple", 
      ram: 12, 
      storage: 256, 
      battery: 93, 
      price: 15500000, 
      sellerId: seller1.id,
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"
      ],
      healthCheck: null
    },
    // Realme products
    { 
      modelSlug: "realme-gt-7-pro", 
      title: "Realme GT 7 Pro 256GB Galaxy Grey", 
      condition: "EXCELLENT_98" as ProductCondition, 
      warranty: "OUT_OF_WARRANTY" as WarrantyType,
      color: "Galaxy Grey", 
      ram: 12, 
      storage: 256, 
      battery: 95, 
      price: 11500000, 
      sellerId: seller2.id,
      images: [
        "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800"
      ],
      healthCheck: null
    },
    { 
      modelSlug: "iphone-se-3", 
      title: "iPhone SE 3 128GB Midnight", 
      condition: "GOOD" as ProductCondition, 
      warranty: "SELLER_WARRANTY" as WarrantyType,
      color: "Midnight", 
      ram: 4, 
      storage: 128, 
      battery: 82, 
      price: 7500000, 
      sellerId: seller2.id,
      images: [
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"
      ],
      healthCheck: {
        serialNumber: "DN2F3456AB",
        wifiMacAddress: "E4:F5:A6:B7:C8:D9",
        bluetoothMacAddress: "E4:F5:A6:B7:C8:D0",
        iosVersion: "17.5",
        activationStatus: "Activated",
        jailbreakStatus: "No Jailbreak",
        securityLockStatus: "Unlocked",
        batteryCycleCount: 487,
        batteryHealth: 82,
        screen: PASS, cameraFront: PASS, cameraBack: PASS,
        speaker: PASS, microphone: PASS, wifi: PASS,
        bluetooth: PASS, fingerprint: PASS,
        faceId: NOT_TESTED, chargingPort: PASS,
        overallStatus: "Good",
        notes: "Máy cũ, pin 82%, có trầy nhẹ mặt lưng"
      }
    },
  ]

  let productCount = 0
  for (let i = 0; i < productSamples.length; i++) {
    const p = productSamples[i]
    const model = phoneModels.find((m) => m.slug === p.modelSlug)
    if (!model) continue

    const slug = `${p.modelSlug}-${Date.now()}-${i}`
    const product = await prisma.product.create({
      data: {
        sellerId: p.sellerId,
        brandId: model.brandId,
        modelId: model.id,
        categoryId: smartphoneCat.id,
        title: p.title,
        slug,
        description: `${p.title}, pin ${p.battery}%, máy zin chưa sửa chữa, đầy đủ phụ kiện nguyên seal. Cam kết máy chính hãng, không passcode, không iCloud.`,
        condition: p.condition,
        warranty: p.warranty,
        ramGb: p.ram,
        storageGb: p.storage,
        color: p.color,
        batteryHealth: p.battery,
        price: p.price,
        negotiable: true,
        status: "ACTIVE",
        viewCount: Math.floor(Math.random() * 800) + 50,
        images: {
          create: p.images.map((url, idx) => ({
            url,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        },
        healthCheck: p.healthCheck ? {
          create: p.healthCheck
        } : undefined,
      },
    })
    productCount++
    console.log(`✅ Created product: ${product.title}`)
  }

  console.log(`\n🎉 Seed completed!`)
  console.log(`\n📊 Summary:`)
  console.log(`   • 1 Admin user`)
  console.log(`   • 2 Seller users`)
  console.log(`   • 1 Buyer user`)
  console.log(`   • ${brands.length} Brands`)
  console.log(`   • ${phoneModels.length} Phone Models`)
  console.log(`   • ${categories.length} Categories`)
  console.log(`   • ${productCount} Products (${productSamples.filter(p => p.healthCheck).length} with health checks)`)
  console.log(`\n🔐 Test Accounts:`)
  console.log(`   Admin: admin.hnt@gmail.com / admin123`)
  console.log(`   Seller: seller.hnt@gmail.com / seller123`)
  console.log(`   Seller2: seller2.hnt@gmail.com / seller456`)
  console.log(`   Buyer: buyer.hnt@gmail.com / buyer123`)
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
