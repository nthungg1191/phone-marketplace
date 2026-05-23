import "next-auth"
import "next-auth/jwt"
import type { UserRole, SellerStatus, SellerRank } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    role: UserRole
    sellerStatus: SellerStatus
    sellerRank: SellerRank
    isLocked?: boolean
    lockedReason?: string | null
    lockedAt?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: UserRole
      sellerStatus: SellerStatus
      sellerRank: SellerRank
      isLocked: boolean
      lockedReason: string | null
      lockedAt: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    sellerStatus: SellerStatus
    sellerRank: SellerRank
    isLocked: boolean
    lockedReason: string | null
    lockedAt: string | null
  }
}
