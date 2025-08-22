'use client'

import { createContext, useContext, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/auth'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // 現在のセッションをチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 認証状態の変更をリッスン
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}