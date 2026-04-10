import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema
const credentialsSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
})

export const authConfig: NextAuthConfig = {
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // Credentials (Email/Password)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email: parsed.email },
          })

          if (!user || !user.password) {
            return null
          }

          const isValid = await bcrypt.compare(parsed.password, user.password)

          if (!isValid) {
            return null
          }

          if (user.isLocked) {
            throw new Error("Tài khoản đã bị khóa")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            sellerStatus: user.sellerStatus,
            sellerRank: user.sellerRank,
            image: user.avatar,
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            // Zod v4
            const issues = (error as { issues?: Array<{ message?: string }> }).issues
            throw new Error(issues?.[0]?.message || "Dữ liệu không hợp lệ")
          }
          throw error
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === "google" && profile) {
        const email = profile.email
        if (!email) return false

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser) {
          // Update user info from Google
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
          // Create new user
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
        // Cast user to our extended type
        const extUser = user as {
          id: string
          role: string
          sellerStatus: string
          sellerRank: string
        }
        token.id = extUser.id
        token.role = extUser.role
        token.sellerStatus = extUser.sellerStatus
        token.sellerRank = extUser.sellerRank
      }

      // Handle session update
      if (trigger === "update" && session) {
        token.name = session.name
        token.email = session.email
        token.role = session.role
        token.sellerStatus = session.sellerStatus
        token.sellerRank = session.sellerRank
        token.picture = session.avatar
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.sellerStatus = token.sellerStatus as string
        session.user.sellerRank = token.sellerRank as string
      }

      return session
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/auth/register",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.AUTH_SECRET,

  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
