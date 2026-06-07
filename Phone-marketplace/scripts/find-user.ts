import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { prisma } from '../src/lib/prisma'

async function main() {
  const u = await prisma.user.findFirst({ select: { id: true, email: true } })
  console.log(JSON.stringify(u))
}
main().catch(console.error)
