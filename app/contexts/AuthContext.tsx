'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { checkAIUsage, UsageInfo } from '../services/subscriptionService'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  // Subscription related
  usageInfo: UsageInfo | null
  isPremium: boolean
  canUseAI: boolean
  refreshUsage: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const refreshUsage = useCallback(async () => {
    if (!user) {
      setUsageInfo(null)
      return
    }
    
    try {
      const usage = await checkAIUsage()
      setUsageInfo(usage)
    } catch (error) {
      console.error('Error fetching usage info:', error)
    }
  }, [user])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session) {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  // Fetch usage info when user changes
  useEffect(() => {
    if (user) {
      refreshUsage()
    } else {
      setUsageInfo(null)
    }
  }, [user, refreshUsage])

  const signInWithGoogle = async (redirectTo?: string) => {
    const redirectUrl = redirectTo || '/projects'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      },
    })
    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    setUsageInfo(null)
    router.push('/login')
  }

  const isPremium = usageInfo?.isPremium || false
  const canUseAI = usageInfo?.canGenerate ?? true // Default to true if not loaded yet

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signOut,
      usageInfo,
      isPremium,
      canUseAI,
      refreshUsage
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
