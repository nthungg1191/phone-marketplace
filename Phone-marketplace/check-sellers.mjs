import { prisma } from './src/lib/prisma'

async function main() {
  const sellerId = 'cmo47a739002w7q1rmfg7brny'

  const orders = await prisma.order.findMany({
    where: { sellerId, status: 'COMPLETED' },
    select: { totalAmount: true, completedAt: true, createdAt: true }
  })

  console.log('Total completed orders:', orders.length)
  const totalRev = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
  console.log('Total revenue:', totalRev.toLocaleString(), 'VND')

  const byMonth = {}
  for (const o of orders) {
    const date = o.completedAt || o.createdAt
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { count: 0, revenue: 0 }
    byMonth[key].count++
    byMonth[key].revenue += Number(o.totalAmount)
  }

  console.log('\nMonthly data:')
  Object.entries(byMonth).sort().forEach(([k, v]) => {
    console.log('  ' + k + ':', v.count, 'orders,', v.revenue.toLocaleString(), 'VND')
  })

  await prisma.$disconnect()
}

main()
