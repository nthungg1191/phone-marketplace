#!/usr/bin/env node

/**
 * Database Backup Script
 * Backup PostgreSQL database to a JSON file
 * 
 * Usage: 
 *   node scripts/backup.js                    - Backup to backups folder
 *   node scripts/backup.js --restore ./backups/xxx.json - Restore from backup
 *   node scripts/backup.js --list             - List all backups
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client")
const fs = require("fs")
const path = require("path")

const prisma = new PrismaClient()

const BACKUP_DIR = path.join(__dirname, "../backups")

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

function getTimestamp() {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

async function backupDatabase() {
  console.log("📦 Starting database backup...\n")

  const timestamp = getTimestamp()
  const filename = `backup-${timestamp}.json`
  const filepath = path.join(BACKUP_DIR, filename)

  try {
    // Fetch all data
    const [users, brands, phoneModels, categories, products, conversations, messages, addresses, orders, orderItems, payments, offers, reviews, notifications, sellerStats, trustScoreHistory, carts, cartItems] = await Promise.all([
      prisma.user.findMany({ 
        include: { sellerStats: true } 
      }),
      prisma.brand.findMany(),
      prisma.phoneModel.findMany(),
      prisma.category.findMany(),
      prisma.product.findMany({ 
        include: { 
          images: true, 
          healthCheck: true 
        } 
      }),
      prisma.conversation.findMany({ 
        include: { 
          participants: true, 
          messages: true 
        } 
      }),
      prisma.message.findMany(),
      prisma.address.findMany(),
      prisma.order.findMany({ 
        include: { items: true } 
      }),
      prisma.orderItem.findMany(),
      prisma.paymentTransaction.findMany(),
      prisma.offer.findMany(),
      prisma.review.findMany(),
      prisma.notification.findMany(),
      prisma.sellerStats.findMany(),
      prisma.trustScoreHistory.findMany(),
      prisma.cart.findMany({ include: { items: true } }),
      prisma.cartItem.findMany(),
    ])

    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      database: {
        users,
        brands,
        phoneModels,
        categories,
        products,
        conversations,
        messages,
        addresses,
        orders,
        orderItems,
        payments,
        offers,
        reviews,
        notifications,
        sellerStats,
        trustScoreHistory,
        carts,
        cartItems,
      },
      stats: {
        users: users.length,
        brands: brands.length,
        phoneModels: phoneModels.length,
        categories: categories.length,
        products: products.length,
        conversations: conversations.length,
        messages: messages.length,
        orders: orders.length,
        offers: offers.length,
        reviews: reviews.length,
      }
    }

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))

    console.log(`✅ Backup created successfully!`)
    console.log(`📁 File: ${filepath}`)
    console.log(`📊 Data:`)
    console.log(`   • ${users.length} users`)
    console.log(`   • ${brands.length} brands`)
    console.log(`   • ${phoneModels.length} phone models`)
    console.log(`   • ${categories.length} categories`)
    console.log(`   • ${products.length} products`)
    console.log(`   • ${orders.length} orders`)
    console.log(`   • ${offers.length} offers`)
    console.log(`   • ${reviews.length} reviews`)
    console.log(`\n💾 Backup size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`)

    return filepath
  } catch (error) {
    console.error("❌ Backup failed:", error)
    throw error
  }
}

async function restoreDatabase(filepath) {
  console.log("🔄 Starting database restore...\n")

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Backup file not found: ${filepath}`)
    process.exit(1)
  }

  const backup = JSON.parse(fs.readFileSync(filepath, "utf8"))

  console.log(`📋 Backup version: ${backup.version}`)
  console.log(`📅 Backup date: ${backup.timestamp}`)
  console.log(`📊 Contains:`)
  console.log(`   • ${backup.stats.users} users`)
  console.log(`   • ${backup.stats.products} products`)
  console.log(`   • ${backup.stats.orders} orders`)
  console.log(`\n⚠️  This will CLEAR all existing data!`)
  console.log(`⚠️  Press Ctrl+C to cancel...\n`)

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000))

  try {
    // Clear existing data in reverse order (respecting foreign keys)
    console.log("🗑️  Clearing existing data...")
    
    await prisma.trustScoreHistory.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.review.deleteMany()
    await prisma.offer.deleteMany()
    await prisma.paymentTransaction.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.cartItem.deleteMany()
    await prisma.cart.deleteMany()
    await prisma.message.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.healthCheck.deleteMany()
    await prisma.productImage.deleteMany()
    await prisma.product.deleteMany()
    await prisma.address.deleteMany()
    await prisma.sellerStats.deleteMany()
    await prisma.user.deleteMany()
    await prisma.category.deleteMany()
    await prisma.phoneModel.deleteMany()
    await prisma.brand.deleteMany()

    console.log("✅ Cleared existing data")

    // Restore data
    console.log("📥 Restoring data...")

    // Brands
    for (const brand of backup.database.brands) {
      await prisma.brand.create({ data: brand })
    }
    console.log(`   • ${backup.database.brands.length} brands`)

    // Categories
    for (const category of backup.database.categories) {
      await prisma.category.create({ data: category })
    }
    console.log(`   • ${backup.database.categories.length} categories`)

    // Phone Models
    for (const model of backup.database.phoneModels) {
      await prisma.phoneModel.create({ data: model })
    }
    console.log(`   • ${backup.database.phoneModels.length} phone models`)

    // Users (with sellerStats)
    for (const user of backup.database.users) {
      const { sellerStats, ...userData } = user
      await prisma.user.create({ 
        data: { 
          ...userData, 
          sellerStats: sellerStats ? { create: sellerStats } : undefined 
        } 
      })
    }
    console.log(`   • ${backup.database.users.length} users`)

    // Products (with images and healthCheck)
    for (const product of backup.database.products) {
      const { images, healthCheck, ...productData } = product
      await prisma.product.create({ 
        data: { 
          ...productData, 
          images: images ? { create: images } : undefined,
          healthCheck: healthCheck ? { create: healthCheck } : undefined,
        } 
      })
    }
    console.log(`   • ${backup.database.products.length} products`)

    // Orders
    for (const order of backup.database.orders) {
      const { items, ...orderData } = order
      await prisma.order.create({ 
        data: { 
          ...orderData, 
          items: items ? { create: items } : undefined 
        } 
      })
    }
    console.log(`   • ${backup.database.orders.length} orders`)

    console.log("\n✅ Restore completed successfully!")
    return true
  } catch (error) {
    console.error("❌ Restore failed:", error)
    throw error
  }
}

async function listBackups() {
  console.log("📁 Available backups:\n")

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse()

  if (files.length === 0) {
    console.log("   No backups found")
    return
  }

  files.forEach((file, i) => {
    const filepath = path.join(BACKUP_DIR, file)
    const stat = fs.statSync(filepath)
    const date = new Date(file.replace("backup-", "").replace(/-/g, ":").slice(0, 19))
    const size = (stat.size / 1024 / 1024).toFixed(2)
    
    console.log(`${i + 1}. ${file}`)
    console.log(`   📅 ${date.toLocaleString("vi-VN")}`)
    console.log(`   💾 ${size} MB\n`)
  })
}

// Main
const args = process.argv.slice(2)

if (args.includes("--list")) {
  listBackups()
} else if (args.includes("--restore")) {
  const restorePath = args[args.indexOf("--restore") + 1]
  if (!restorePath) {
    console.error("Usage: node scripts/backup.js --restore ./backups/xxx.json")
    process.exit(1)
  }
  restoreDatabase(restorePath)
} else {
  backupDatabase()
}

prisma.$disconnect()
