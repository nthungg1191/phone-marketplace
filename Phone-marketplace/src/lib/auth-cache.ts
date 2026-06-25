/**
 * Cached auth() wrapper using React's cache().
 *
 * Within a single server render (or a single API route invocation),
 * all calls to getSession() resolve to the same promise — one Prisma
 * query instead of N.
 *
 * Works ONLY in Server Components and Route Handlers (not Client Components).
 * Safe because the session cannot change mid-request.
 */
import { cache } from "react"
import { auth } from "@/lib/auth"

export const getSession = cache(async () => auth())
