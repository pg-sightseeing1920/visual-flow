import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// シングルトンクライアント（型なし - 動作確認用）
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

// クライアントサイド用
export const createClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseInstance
}

// 基本的な型定義（参考用）
export type Project = {
  id: string
  name: string
  description: string | null
  owner_id: string
  settings: any
  created_at: string
  updated_at: string
}

export type Block = {
  id: string
  project_id: string
  type: string
  title: string
  description: string | null
  position: { x: number; y: number }
  visual_settings: any
  status: string
  created_at: string
  updated_at: string
}

export type Connection = {
    id: string
    project_id: string
    source_block_id: string
    target_block_id: string
    source_anchor: 'top' | 'right' | 'bottom' | 'left'
    target_anchor: 'top' | 'right' | 'bottom' | 'left'
    created_at: string
    updated_at: string
  }