'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/lib/store/auth'
import { useCanvasStore } from '@/lib/store/canvas'
import { createClient, Project, Block } from '@/lib/supabase/client'
import { useProjectPermissions } from '@/lib/permissions'
import { toast } from 'react-hot-toast'
import { 
  CogIcon,
  ShareIcon,
  UserGroupIcon,
  BellIcon
} from '@heroicons/react/24/outline'

// Dynamic import でCanvasコンポーネントをクライアントサイドでのみ読み込み
const Canvas = dynamic(
  () => import('@/components/canvas/Canvas').then(mod => ({ default: mod.Canvas })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">キャンバスを読み込み中...</p>
        </div>
      </div>
    ),
  }
)

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Phase 2: 権限管理用の状態変数を追加
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer' | null>(null)
  
  const { user } = useAuthStore()
  const { setBlocks, setConnections } = useCanvasStore()
  const router = useRouter()

  // Phase 2: 権限チェック
  const { permissions, checker } = useProjectPermissions(currentUserRole || undefined)

  // paramsの解決
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // プロジェクトとブロックの読み込み
  useEffect(() => {
    if (!user || !resolvedParams) return

    loadProjectData(resolvedParams.id)
  }, [user, resolvedParams])

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
  
      if (projectError) {
        console.error('Project load error:', projectError)
        throw projectError
      }
  
      if (!projectData) {
        throw new Error('Project not found')
      }

      setProject(projectData)

      // Phase 2: プロジェクトメンバーシップをチェック
      const { data: membershipData, error: membershipError } = await supabaseAny
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .eq('status', 'accepted')
        .single()

      if (membershipError || !membershipData) {
        // メンバーシップが見つからない場合、オーナーかどうかチェック（後方互換性）
        if (projectData.owner_id === user!.id) {
          console.log('Owner access detected, setting owner role')
          setCurrentUserRole('owner')
        } else {
          toast.error('このプロジェクトにアクセスする権限がありません')
          router.push('/dashboard')
          return
        }
      } else {
        setCurrentUserRole(membershipData.role)
      }
  
      // ブロック情報を取得
      const { data: blocksData, error: blocksError } = await supabaseAny
        .from('blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
  
      if (blocksError) {
        console.error('Blocks load error:', blocksError)
        throw blocksError
      }
  
      // 接続情報を取得 - これが重要
      console.log('接続データを読み込み中...')
      const { data: connectionsData, error: connectionsError } = await supabaseAny
        .from('connections')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
  
      console.log('接続データの読み込み結果:', { connectionsData, connectionsError })
  
      if (connectionsError) {
        console.error('Connections load error:', connectionsError)
        // 接続データのエラーは致命的ではないので、ログのみ出力
      }
  
      // Canvas Store に設定
      setBlocks(blocksData || [])
      
      // useCanvasStore の setConnections を使用
      const { setConnections } = useCanvasStore.getState()
      setConnections(connectionsData || [])
      
      console.log('Canvas Store に設定した接続データ:', connectionsData?.length || 0, '件')
      
    } catch (error: any) {
      console.error('Error loading project:', error)
      toast.error(`プロジェクトの読み込みに失敗しました: ${error.message}`)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !resolvedParams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">プロジェクトを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">プロジェクトが見つかりません</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-none px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-sm text-gray-600">{project.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* プロジェクト権限表示 */}
              {currentUserRole && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {currentUserRole === 'owner' ? 'オーナー' :
                   currentUserRole === 'admin' ? '管理者' :
                   currentUserRole === 'editor' ? '編集者' : '閲覧者'}
                </span>
              )}

              {/* 最終更新日 */}
              <span className="text-sm text-gray-600">
                最終更新: {new Date(project.updated_at).toLocaleDateString('ja-JP')}
              </span>

              {/* プロジェクト設定ボタン */}
              {currentUserRole && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <button
                  onClick={() => router.push(`/project/${resolvedParams.id}/settings`)}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                  title="プロジェクト設定"
                >
                  <CogIcon className="w-5 h-5" />
                </button>
              )}

              {/* 共有ボタン（管理者・オーナーのみ） */}
              {checker.canInvite() && (
                <button
                  onClick={() => router.push(`/project/${resolvedParams.id}/settings`)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>共有</span>
                </button>
              )}

              {/* メニューボタン（その他のオプション用） */}
              <button className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* キャンバス */}
      <div className="h-[calc(100vh-73px)]">
        <Canvas 
          projectId={resolvedParams.id}
          canEdit={checker?.canEdit() || false}
          canComment={checker?.canComment() || false}
        />
      </div>
    </div>
  )
}