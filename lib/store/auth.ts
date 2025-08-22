import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { createClient } from '../supabase/client'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  },

  signUp: async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  },

  signOut: async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ user: null })
  },

  setUser: (user: User | null) => set({ user }),
  setLoading: (loading: boolean) => set({ loading }),
}))