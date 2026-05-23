// Script to reset viewCount to 0 for all products
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  console.log("Resetting viewCount for all products...")

  const result = await prisma.product.updateMany({
    data: {
      viewCount: 0,
    },
  })

  console.log(`Updated ${result.count} products. All viewCount reset to 0.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
