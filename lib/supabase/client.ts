import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// クライアントサイド用（ブラウザ）
export const createClient = () => {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  // サーバーサイド用は後で必要に応じて追加
  export const createBrowserSupabaseClient = () => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

// Database types
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          settings: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          project_id: string
          type: 'goal' | 'task' | 'note' | 'decision'
          title: string
          description: string | null
          position: { x: number; y: number }
          visual_settings: Record<string, any>
          status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'goal' | 'task' | 'note' | 'decision'
          title: string
          description?: string | null
          position: { x: number; y: number }
          visual_settings?: Record<string, any>
          status?: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'goal' | 'task' | 'note' | 'decision'
          title?: string
          description?: string | null
          position?: { x: number; y: number }
          visual_settings?: Record<string, any>
          status?: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}