'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type Project = Database['public']['Tables']['projects']['Row']

export default function DashboardPage() {
  const { user, loading, signOut } = useAuthStore()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      loadProjects()
    }
  }, [user, loading, router])

  const loadProjects = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error: any) {
      toast.error('プロジェクトの読み込みに失敗しました')
      console.error('Error loading projects:', error)
    } finally {
      setProjectsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error: any) {
      toast.error('ログアウトに失敗しました')
    }
  }

  const createNewProject = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: '新しいプロジェクト',
          description: '',
          owner_id: user!.id,
        })
        .select()
        .single()

      if (error) throw error
      
      toast.success('プロジェクトを作成しました')
      router.push(`/project/${data.id}`)
    } catch (error: any) {
      toast.error('プロジェクトの作成に失敗しました')
      console.error('Error creating project:', error)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard">
                <h1 className="text-2xl font-bold text-gray-900">VisualFlow</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                こんにちは、{user.email}さん
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">マイプロジェクト</h1>
          <button
            onClick={createNewProject}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しいプロジェクト
          </button>
        </div>

        {/* プロジェクト一覧 */}
        {projectsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">プロジェクトを読み込み中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">プロジェクトがありません</h3>
            <p className="mt-1 text-sm text-gray-500">最初のプロジェクトを作成して始めましょう。</p>
            <div className="mt-6">
              <button
                onClick={createNewProject}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しいプロジェクト
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {project.description || 'プロジェクトの説明はありません'}
                  </p>
                  <div className="mt-4 text-xs text-gray-500">
                    作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}