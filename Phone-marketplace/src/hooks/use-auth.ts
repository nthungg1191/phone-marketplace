"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

// Extend the session user type
interface ExtendedUser {
  id: string
  email: string
  name: string
  image?: string | null
  role: string
  sellerStatus: string
  sellerRank: string
}

interface ExtendedSession {
  user: ExtendedUser
  expires: string
}

export function useAuth(requireAuth: boolean = false) {
  const { data: session, status } = useSession() as { data: ExtendedSession | null; status: "loading" | "authenticated" | "unauthenticated" }
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [requireAuth, status, router])

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  }
}

// Helper to check user role
export function hasRole(user: ExtendedUser | null, role: string): boolean {
  return user?.role === role
}

// Helper to check if user is seller and approved
export function isApprovedSeller(user: ExtendedUser | null): boolean {
  return user?.role === "SELLER" && user?.sellerStatus === "APPROVED"
}

// Helper to check if user is admin
export function isAdmin(user: ExtendedUser | null): boolean {
  return user?.role === "ADMIN"
}