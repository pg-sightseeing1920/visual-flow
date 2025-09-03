'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CogIcon, 
  UserGroupIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  PencilIcon 
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/store/auth'
import { createClient, Project, ProjectMember } from '@/lib/supabase/client'
import { useProjectPermissions } from '@/lib/permissions'
import { MemberManagement } from '@/components/project/MemberManagement'
import { toast } from 'react-hot-toast'

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer' | null>(null)
  const [loading, setLoading] = useState(true)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  
  const { user } = useAuthStore()
  const router = useRouter()

  // paramsの解決
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // プロジェクトデータの読み込み
  useEffect(() => {
    if (!user || !resolvedParams) return
    loadProjectData(resolvedParams.id)
  }, [user, resolvedParams])

  // 権限計算
  const { permissions, checker } = useProjectPermissions(currentUserRole || undefined)

  const loadProjectData = async (projectId: string) => {
    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      // プロジェクト情報を取得
      const { data: projectData, error: projectError } = await supabaseAny
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      if (!projectData) throw new Error('Project not found')

      setProject(projectData)
      setProjectName(projectData.name)
      setProjectDescription(projectData.description || '')

      // プロジェクトメンバーシップを確認
      const { data: membershipData, error: membershipError } = await supabaseAny
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .eq('status', 'accepted')
        .single()

      if (membershipError || !membershipData) {
        toast.error('このプロジェクトにアクセスする権限がありません')
        router.push('/dashboard')
        return
      }

      setCurrentUserRole(membershipData.role)

    } catch (error: any) {
      console.error('Error loading project:', error)
      toast.error(`プロジェクトの読み込みに失敗しました: ${error.message}`)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProject = async () => {
    if (!project || !checker.canUpdateProject()) {
      toast.error('プロジェクトを更新する権限がありません')
      return
    }

    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      const { error } = await supabaseAny
        .from('projects')
        .update({
          name: projectName,
          description: projectDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)

      if (error) throw error

      setProject(prev => prev ? {
        ...prev,
        name: projectName,
        description: projectDescription
      } : null)
      
      setEditingProject(false)
      toast.success('プロジェクト情報を更新しました')

    } catch (error: any) {
      console.error('Error updating project:', error)
      toast.error('プロジェクトの更新に失敗しました')
    }
  }

  const handleDeleteProject = async () => {
    if (!project || !checker.canDelete()) {
      toast.error('プロジェクトを削除する権限がありません')
      return
    }

    const confirmText = project.name
    const userInput = prompt(`プロジェクトを完全に削除します。確認のため「${confirmText}」と入力してください：`)
    
    if (userInput !== confirmText) {
      toast.error('プロジェクト名が一致しません')
      return
    }

    try {
      const supabase = createClient()
      const supabaseAny = supabase as any

      const { error } = await supabaseAny
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      toast.success('プロジェクトを削除しました')
      router.push('/dashboard')

    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast.error('プロジェクトの削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">設定を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!project || !currentUserRole) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/project/${project.id}`)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>プロジェクトに戻る</span>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <CogIcon className="w-6 h-6" />
                  <span>プロジェクト設定</span>
                </h1>
                <p className="text-sm text-gray-500">{project.name}</p>
              </div>
            </div>
            
            <span className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
              {currentUserRole === 'owner' ? 'オーナー' :
               currentUserRole === 'admin' ? '管理者' :
               currentUserRole === 'editor' ? '編集者' : '閲覧者'}
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          
          {/* プロジェクト基本情報 */}
          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">基本情報</h2>
              {checker.canUpdateProject() && (
                <button
                  onClick={() => setEditingProject(!editingProject)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>{editingProject ? 'キャンセル' : '編集'}</span>
                </button>
              )}
            </div>
            
            {editingProject ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プロジェクト名
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="プロジェクトの説明を入力..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpdateProject}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(false)
                      setProjectName(project.name)
                      setProjectDescription(project.description || '')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">プロジェクト名</label>
                  <p className="text-gray-900">{project.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">説明</label>
                  <p className="text-gray-600">{project.description || '説明なし'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">作成日</label>
                  <p className="text-gray-600">{new Date(project.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </section>

          {/* メンバー管理セクション */}
          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <UserGroupIcon className="w-5 h-5" />
                <span>メンバー管理</span>
              </h2>
              {checker.canInvite() && (
                <button
                  onClick={() => setMemberModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  メンバーを招待
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              プロジェクトメンバーの管理と権限設定を行えます。
            </div>
            
            <button
              onClick={() => setMemberModalOpen(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors"
            >
              <UserGroupIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">メンバー管理画面を開く</p>
            </button>
          </section>

          {/* 危険な操作セクション */}
          {checker.canDelete() && (
            <section className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <h2 className="text-lg font-medium text-red-900 mb-4 flex items-center space-x-2">
                <TrashIcon className="w-5 h-5" />
                <span>危険な操作</span>
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-red-900">プロジェクトの削除</h3>
                  <p className="text-sm text-red-700 mb-3">
                    この操作は取り消せません。すべてのデータ、ブロック、接続、コメントが完全に削除されます。
                  </p>
                  <button
                    onClick={handleDeleteProject}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    プロジェクトを削除
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* メンバー管理モーダル */}
      <MemberManagement
        projectId={resolvedParams?.id || ''}
        currentUserRole={currentUserRole || 'viewer'}
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
      />
    </div>
  )
}