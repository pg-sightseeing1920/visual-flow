'use client'

import { useState, useEffect, useRef } from 'react'
import { Block } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/client'
import { useCanvasStore } from '@/lib/store/canvas'
import { toast } from 'react-hot-toast'

interface BlockEditModalProps {
  block: Block | null
  isOpen: boolean
  onClose: () => void
}

export const BlockEditModal = ({ block, isOpen, onClose }: BlockEditModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<string>('task')
  const [status, setStatus] = useState<string>('pending')
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  
  const { updateBlock } = useCanvasStore()

  // モーダルが開かれた時にブロックデータを設定
  useEffect(() => {
    if (isOpen && block) {
      setTitle(block.title)
      setDescription(block.description || '')
      setType(block.type)
      setStatus(block.status)
    }
  }, [isOpen, block])

  // モーダル外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // 少し遅延を入れてイベントリスナーを追加
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSave = async () => {
    if (!block) return
    
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      const supabaseAny = supabase as any
      
      const updatedData = {
        title: title.trim() || '無題',
        description: description.trim() || null,
        type,
        status
      }
      
      const { error } = await supabaseAny
        .from('blocks')
        .update(updatedData)
        .eq('id', block.id)

      if (error) {
        console.error('Block update error:', error)
        throw error
      }

      // ローカル状態を更新
      updateBlock(block.id, updatedData)
      
      toast.success('ブロックを更新しました')
      onClose()
      
    } catch (error: any) {
      console.error('ブロック更新エラー:', error)
      toast.error(`更新に失敗しました: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (block) {
      setTitle(block.title)
      setDescription(block.description || '')
      setType(block.type)
      setStatus(block.status)
    }
    onClose()
  }

  if (!isOpen || !block) return null

  return (
    <>
      {/* 背景オーバーレイ（薄暗くならない） */}
      <div 
        className="fixed inset-0 z-40"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* スライドインパネル */}
      <div
        ref={modalRef}
        className={`fixed top-0 right-0 h-full w-[35%] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } border-l border-gray-200`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              ブロックを編集
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="タイトルを入力..."
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
                  placeholder="詳細な説明を入力..."
                />
              </div>

              {/* タイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイプ
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="goal">🎯 目標</option>
                  <option value="task">✅ タスク</option>
                  <option value="note">📝 ノート</option>
                  <option value="decision">⚡ 決定事項</option>
                </select>
              </div>

              {/* ステータス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="pending">⏳ 未着手</option>
                  <option value="in_progress">🔄 進行中</option>
                  <option value="completed">✅ 完了</option>
                  <option value="paused">⏸️ 一時停止</option>
                  <option value="cancelled">❌ キャンセル</option>
                </select>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}