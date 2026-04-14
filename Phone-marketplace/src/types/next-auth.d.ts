import "next-auth"
import "next-auth/jwt"
import type { UserRole, SellerStatus, SellerRank } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    role: UserRole
    sellerStatus: SellerStatus
    sellerRank: SellerRank
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
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    sellerStatus: SellerStatus
    sellerRank: SellerRank
  }
}
