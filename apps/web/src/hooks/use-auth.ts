"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"

interface User {
  id: string
  name: string
  email: string
}

interface Session {
  user: User
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
    createdAt: Date
    updatedAt: Date
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionData = await authClient.getSession()
        setSession(sessionData.data)
      } catch {
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [])

  return {
    session,
    user: session?.user || null,
    loading,
    isAuthenticated: !!session,
  }
}