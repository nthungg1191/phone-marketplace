import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      sellerStatus: string
      sellerRank: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    sellerStatus: string
    sellerRank: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    sellerStatus: string
    sellerRank: string
    name?: string | null
    email?: string | null
    picture?: string | null
    sub?: string
  }
}
