import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// シングルトンクライアント（型なし - 動作確認用）
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

// phase1
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

// phase2
export type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  invited_by: string | null
  invited_at: string
  joined_at: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  updated_at: string
}

export type ProjectInvitation = {
  id: string
  project_id: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  invited_by: string
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export type Comment = {
  id: string
  block_id: string
  project_id: string
  user_id: string
  content: string
  mentions: string[]
  parent_comment_id: string | null
  created_at: string
  updated_at: string
}

export type Notification = {
  id: string
  user_id: string
  project_id: string
  type: 'mention' | 'comment' | 'invitation' | 'project_update'
  title: string
  content: string | null
  data: Record<string, any>
  read_at: string | null
  created_at: string
}

export type ActivityLog = {
  id: string
  project_id: string
  user_id: string
  action: string
  target_type: 'project' | 'block' | 'connection' | 'comment'
  target_id: string | null
  data: Record<string, any>
  created_at: string
}

// ユーザープロフィール拡張
export type UserProfile = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// プロジェクト権限チェック用のヘルパー型
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type ProjectPermissions = {
  canEdit: boolean
  canInvite: boolean
  canDelete: boolean
  canComment: boolean
  canView: boolean
}

// Realtime用の型
export type RealtimeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, any>
  old: Record<string, any>
  table: string
}

export type PresenceData = {
  user_id: string
  user_name: string
  user_avatar: string | null
  cursor_position: { x: number; y: number } | null
  selected_block_id: string | null
  last_seen: string
}