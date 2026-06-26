"use client"

import { NotificationProvider } from "./notification-provider"

export function NotificationClientProvider({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>
}