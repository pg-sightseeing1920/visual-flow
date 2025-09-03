// components/project/MemberManagement.tsx - メンバー管理コンポーネント

'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  UserIcon, 
  PlusIcon, 
  XMarkIcon, 
  SparklesIcon, 
  ShieldCheckIcon, 
  PencilSquareIcon, 
  EyeIcon,
  EnvelopeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { createClient, ProjectMember, ProjectInvitation, UserProfile } from '@/lib/supabase/client'
import { useProjectPermissions } from '@/lib/permissions'
import { toast } from 'react-hot-toast'

interface MemberManagementProps {
  projectId: string
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer'
  isOpen: boolean
  onClose: () => void
}

export function MemberManagement({ projectId, currentUserRole, isOpen, onClose }: MemberManagementProps) {
  const [members, setMembers] = useState<(ProjectMember & { profiles: UserProfile })[]>([])
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer')
  const [isInviting, setIsInviting] = useState(false)

  const { checker } = useProjectPermissions(currentUserRole)

  useEffect(() => {
    if (isOpen) {
      loadMembersAndInvitations()
    }
  }, [isOpen, projectId])

  const loadMembersAndInvitations = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      // メンバー一覧を取得（プロフィール情報も含む）
      const { data: membersData, error: membersError } = await supabaseAny
        .from('project_members')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'accepted')
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.error('Members load error:', membersError)
        throw membersError
      }

      // 招待一覧を取得
      const { data: invitationsData, error: invitationsError } = await supabaseAny
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (invitationsError) {
        console.error('Invitations load error:', invitationsError)
        // 招待エラーは致命的でないので続行
      }

      setMembers(membersData || [])
      setInvitations(invitationsData || [])
    } catch (error: any) {
      console.error('Error loading members:', error)
      toast.error('メンバー情報の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('メールアドレスを入力してください')
      return
    }

    if (!checker.canInvite()) {
      toast.error('招待権限がありません')
      return
    }

    setIsInviting(true)

    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      // 既存メンバーのチェック
      const { data: existingMember } = await supabaseAny
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('profiles.email', inviteEmail)
        .single()

      if (existingMember) {
        toast.error('このユーザーは既にプロジェクトのメンバーです')
        return
      }

      // 招待トークンの生成
      const inviteToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7日間有効

      // 招待レコードを作成
      const { data, error } = await supabaseAny
        .from('project_invitations')
        .insert({
          project_id: projectId,
          email: inviteEmail,
          role: inviteRole,
          token: inviteToken,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // TODO: メール送信処理（Phase 2後半で実装）
      console.log('Invitation created:', data)
      
      toast.success('招待を作成しました（メール送信機能は開発中）')
      setInviteEmail('')
      setInviteRole('viewer')
      loadMembersAndInvitations()
    } catch (error: any) {
      console.error('Error inviting member:', error)
      toast.error('招待の作成に失敗しました')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!checker.canManageMembers()) {
      toast.error('権限を変更する権限がありません')
      return
    }

    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      const { error } = await supabaseAny
        .from('project_members')
        .update({ 
          role: newRole, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', memberId)

      if (error) throw error

      toast.success('権限を変更しました')
      loadMembersAndInvitations()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error('権限の変更に失敗しました')
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!checker.canManageMembers()) {
      toast.error('メンバーを削除する権限がありません')
      return
    }

    if (!confirm(`${memberEmail} をプロジェクトから削除しますか？`)) {
      return
    }

    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      const { error } = await supabaseAny
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('メンバーを削除しました')
      loadMembersAndInvitations()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error('メンバーの削除に失敗しました')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <SparklesIcon className="w-4 h-4 text-yellow-500" />
      case 'admin': return <ShieldCheckIcon className="w-4 h-4 text-purple-500" />
      case 'editor': return <PencilSquareIcon className="w-4 h-4 text-blue-500" />
      case 'viewer': return <EyeIcon className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー'
      case 'admin': return '管理者'
      case 'editor': return '編集者'
      case 'viewer': return '閲覧者'
      default: return role
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner': return 'すべての権限（削除・メンバー管理）'
      case 'admin': return 'メンバー管理・編集権限'
      case 'editor': return 'ブロック・接続の編集権限'
      case 'viewer': return '閲覧・コメント権限のみ'
      default: return ''
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black bg-opacity-25 z-50" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              メンバー管理
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {/* 招待セクション */}
            {checker.canInvite() && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" />
                  新しいメンバーを招待
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="email"
                      placeholder="メールアドレス"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isInviting}
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isInviting}
                    >
                      <option value="viewer">閲覧者</option>
                      <option value="editor">編集者</option>
                      <option value="admin">管理者</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={isInviting || !inviteEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      {isInviting ? '招待中...' : '招待'}
                    </button>
                  </div>
                  <div className="text-xs text-blue-700">
                    <strong>{getRoleLabel(inviteRole)}:</strong> {getRoleDescription(inviteRole)}
                  </div>
                </div>
              </div>
            )}

            {/* メンバー一覧 */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                プロジェクトメンバー ({members.length})
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">読み込み中...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          {member.profiles?.avatar_url ? (
                            <img
                              src={member.profiles.avatar_url}
                              alt={member.profiles.name || member.profiles.email}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <span className="text-sm text-gray-600 font-medium">
                              {(member.profiles?.name || member.profiles?.email || 'U')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {member.profiles?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.profiles?.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            参加日: {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '未設定'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-700">
                              {getRoleLabel(member.role)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getRoleDescription(member.role)}
                            </div>
                          </div>
                        </div>
                        
                        {checker.canManageMembers() && member.role !== 'owner' && (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="viewer">閲覧者</option>
                              <option value="editor">編集者</option>
                              <option value="admin">管理者</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id, member.profiles?.email || '')}
                              className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              title="メンバーを削除"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 保留中の招待 */}
            {invitations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  保留中の招待 ({invitations.length})
                </h3>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                          <EnvelopeIcon className="w-5 h-5 text-yellow-700" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {invitation.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getRoleIcon(invitation.role)}
                            <span>{getRoleLabel(invitation.role)} として招待中</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {new Date(invitation.expires_at).toLocaleDateString()} まで有効
                        </div>
                        <div className="text-xs text-yellow-700 mt-1">
                          招待状送信済み
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                権限の詳細についてはヘルプをご確認ください
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}