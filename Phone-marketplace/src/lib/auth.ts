import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { UserRole, SellerStatus, SellerRank } from "@prisma/client"

const credentialsSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
})

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.parse(credentials)
        const user = await prisma.user.findUnique({
          where: { email: parsed.email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(parsed.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sellerStatus: user.sellerStatus,
          sellerRank: user.sellerRank,
          image: user.avatar,
          isLocked: user.isLocked,
          lockedReason: user.lockedReason,
          lockedAt: user.lockedAt?.toISOString(),
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials" && user) {
        const extUser = user as {
          isLocked?: boolean
        }
        if (extUser.isLocked) return false
      }

      if (account?.provider === "google" && profile) {
        const email = profile.email
        if (!email) return false

        const existingUser = await prisma.user.findUnique({ where: { email } })

        if (existingUser) {
          // Check if user is locked
          if (existingUser.isLocked) {
            throw new Error(`LOCKED:${existingUser.lockedReason || "Tài khoản đã bị khóa"}:${existingUser.lockedAt?.toISOString() || ""}`)
          }
          await prisma.user.update({
            where: { email },
            data: {
              avatar: (profile.image as string | null) ?? existingUser.avatar,
              name: (profile.name as string | null) ?? existingUser.name,
              isVerified: true,
              emailVerifiedAt: new Date(),
            },
          })
          user.id = existingUser.id
        } else {
          const newUser = await prisma.user.create({
            data: {
              email,
              name: (profile.name as string | null) || "User",
              avatar: (profile.image as string | null),
              isVerified: true,
              emailVerifiedAt: new Date(),
              sellerStatus: "NONE",
            },
          })
          user.id = newUser.id
        }
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        const extUser = user as {
          id: string
          role: string
          sellerStatus: string
          sellerRank: string
          isLocked?: boolean
          lockedReason?: string | null
          lockedAt?: string | null
        }
        token.id = extUser.id
        token.role = extUser.role as UserRole
        token.sellerStatus = extUser.sellerStatus as SellerStatus
        token.sellerRank = extUser.sellerRank as SellerRank
        token.isLocked = extUser.isLocked || false
        token.lockedReason = extUser.lockedReason || null
        token.lockedAt = extUser.lockedAt || null
      }

      // Check for lock status update on every JWT refresh
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isLocked: true, lockedReason: true, lockedAt: true },
        })
        if (dbUser) {
          token.isLocked = dbUser.isLocked
          token.lockedReason = dbUser.lockedReason
          token.lockedAt = dbUser.lockedAt?.toISOString() || null
        }
      }

      if (trigger === "update" && session) {
        token.name = session.name
        token.email = session.email
        token.role = session.role as UserRole
        token.sellerStatus = session.sellerStatus as SellerStatus
        token.sellerRank = session.sellerRank as SellerRank
        token.picture = session.avatar
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.sellerStatus = token.sellerStatus as SellerStatus
        session.user.sellerRank = token.sellerRank as SellerRank
        // Add lock info to session
        session.user.isLocked = token.isLocked as boolean
        session.user.lockedReason = token.lockedReason as string | null
        session.user.lockedAt = token.lockedAt as string | null
      }
      return session
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.AUTH_SECRET,
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
