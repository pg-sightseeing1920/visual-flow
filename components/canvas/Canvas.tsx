'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Line } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/lib/store/canvas'
import { BlockComponent } from './Block'
import { BlockEditModal } from './BlockEditModal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Block } from '@/lib/supabase/client'

interface CanvasProps {
  projectId: string
}

export const Canvas = ({ projectId }: CanvasProps) => {
  const stageRef = useRef<Konva.Stage>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingBlock, setDeletingBlock] = useState<Block | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const {
    zoom,
    pan,
    blocks,
    setZoom,
    setPan,
    setSelectedBlock,
    isCreatingBlock,
    setIsCreatingBlock,
    addBlock,
    deleteBlock,
    connections,
    setConnections,
    isConnecting,
    setIsConnecting,
    connectingFrom,
    setConnectingFrom
  } = useCanvasStore()

  // ウィンドウサイズの取得と更新
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 73 // ヘッダー分を引く
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // 接続点の座標を計算
  const getAnchorPosition = (block: Block, anchor: string) => {
    const blockWidth = 160
    const blockHeight = 80
    
    switch (anchor) {
      case 'top':
        return { x: block.position.x + blockWidth / 2, y: block.position.y }
      case 'right':
        return { x: block.position.x + blockWidth, y: block.position.y + blockHeight / 2 }
      case 'bottom':
        return { x: block.position.x + blockWidth / 2, y: block.position.y + blockHeight }
      case 'left':
        return { x: block.position.x, y: block.position.y + blockHeight / 2 }
      default:
        return { x: block.position.x + blockWidth / 2, y: block.position.y + blockHeight / 2 }
    }
  }

  // 接続線を描画
  const renderConnectionLines = () => {
    if (!connections || connections.length === 0) return null
    
    const lines: React.ReactElement[] = []
    
    connections.forEach(connection => {
      const sourceBlock = blocks.find(b => b.id === connection.source_block_id)
      const targetBlock = blocks.find(b => b.id === connection.target_block_id)
      
      if (sourceBlock && targetBlock) {
        const sourcePos = getAnchorPosition(sourceBlock, connection.source_anchor)
        const targetPos = getAnchorPosition(targetBlock, connection.target_anchor)
        
        // 矢印の計算
        const dx = targetPos.x - sourcePos.x
        const dy = targetPos.y - sourcePos.y
        const angle = Math.atan2(dy, dx)
        
        // 矢印の頭部
        const arrowLength = 12
        const arrowAngle = Math.PI / 6
        
        const arrowX1 = targetPos.x - arrowLength * Math.cos(angle - arrowAngle)
        const arrowY1 = targetPos.y - arrowLength * Math.sin(angle - arrowAngle)
        const arrowX2 = targetPos.x - arrowLength * Math.cos(angle + arrowAngle)
        const arrowY2 = targetPos.y - arrowLength * Math.sin(angle + arrowAngle)
        
        lines.push(
          <React.Fragment key={connection.id}>
            {/* 接続線 */}
            <Line
              points={[sourcePos.x, sourcePos.y, targetPos.x, targetPos.y]}
              stroke="#3B82F6"
              strokeWidth={2}
              opacity={0.8}
            />
            
            {/* 矢印の頭部 */}
            <Line
              points={[targetPos.x, targetPos.y, arrowX1, arrowY1]}
              stroke="#3B82F6"
              strokeWidth={2}
              opacity={0.8}
            />
            <Line
              points={[targetPos.x, targetPos.y, arrowX2, arrowY2]}
              stroke="#3B82F6"
              strokeWidth={2}
              opacity={0.8}
            />
          </React.Fragment>
        )
      }
    })
    
    return lines
  }

  // 次ステップブロック判定（接続データに基づく）
  const getNextStepBlocks = (): Set<string> => {
    const nextSteps = new Set<string>()
    
    if (!connections) return nextSteps
    
    // 完了ブロックを探す
    const completedBlocks = blocks.filter(block => block.status === 'completed')
    
    // 完了ブロックから接続されているブロックを次ステップとする
    completedBlocks.forEach(completedBlock => {
      connections.forEach(connection => {
        if (connection.source_block_id === completedBlock.id) {
          const targetBlock = blocks.find(b => b.id === connection.target_block_id)
          if (targetBlock && targetBlock.status === 'pending') {
            nextSteps.add(targetBlock.id)
          }
        }
      })
    })
    
    return nextSteps
  }

  const nextStepBlocks = getNextStepBlocks()

  // 接続開始ハンドラー
  const handleConnectionStart = (blockId: string, anchor: string, position: { x: number; y: number }) => {
    console.log('接続開始:', { blockId, anchor, position })
    setIsConnecting(true)
    setConnectingFrom({ blockId, anchor, position })
  }

  // ブロック編集ハンドラー
  const handleEditBlock = (block: Block) => {
    setEditingBlock(block)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingBlock(null)
  }

  // ブロック削除ハンドラー
  const handleDeleteBlock = (block: Block) => {
    setDeletingBlock(block)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingBlock) return

    try {
      const supabase = createClient()
      const supabaseAny = supabase as any
      
      // 関連する接続も削除
      await supabaseAny
        .from('connections')
        .delete()
        .or(`source_block_id.eq.${deletingBlock.id},target_block_id.eq.${deletingBlock.id}`)
      
      // ブロック削除
      const { error } = await supabaseAny
        .from('blocks')
        .delete()
        .eq('id', deletingBlock.id)

      if (error) {
        console.error('Block delete error:', error)
        throw error
      }

      // ローカル状態から削除
      deleteBlock(deletingBlock.id)
      
      // 関連する接続もローカル状態から削除
      const updatedConnections = connections.filter(
        conn => conn.source_block_id !== deletingBlock.id && conn.target_block_id !== deletingBlock.id
      )
      setConnections(updatedConnections)
      
      toast.success('ブロックを削除しました')
      
    } catch (error: any) {
      console.error('ブロック削除エラー:', error)
      toast.error(`削除に失敗しました: ${error.message}`)
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingBlock(null)
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setDeletingBlock(null)
  }

  // キャンバスクリック時の処理
  const handleCanvasClick = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    console.log('Canvas クリック:', {
      target: e.target.className,
      isStage: e.target === stageRef.current,
      isCreatingBlock,
      isConnecting
    })
    
    // Stage 自体がクリックされた場合のみ処理
    if (e.target === stageRef.current) {
      console.log('Stage がクリックされました')
      
      if (isConnecting) {
        console.log('Canvas: 接続モードをキャンセル')
        setIsConnecting(false)
        setConnectingFrom(null)
        return
      }
      
      setSelectedBlock(null)
      
      if (isCreatingBlock) {
        console.log('ブロック作成モード中 - 新しいブロックを作成します')
        const stage = stageRef.current
        if (stage) {
          const pointer = stage.getPointerPosition()
          console.log('マウス位置:', pointer)
          
          if (pointer) {
            const stagePos = stage.position()
            const stageScale = stage.scaleX()
            
            const worldPos = {
              x: Math.round((pointer.x - stagePos.x) / stageScale),
              y: Math.round((pointer.y - stagePos.y) / stageScale)
            }
            
            console.log('計算された座標:', worldPos)
            await createNewBlock(worldPos)
            setIsCreatingBlock(false)
          }
        }
      }
    } else {
      console.log('Stage 以外がクリックされました:', e.target.className)
    }
  }

  // 新しいブロック作成
  const createNewBlock = async (position: { x: number; y: number }) => {
    try {
      const supabase = createClient()
      const supabaseAny = supabase as any
      
      const { data, error } = await supabaseAny
        .from('blocks')
        .insert({
          project_id: projectId,
          type: 'task',
          title: '新しいタスク',
          description: null,
          position,
          visual_settings: {},
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase block creation error:', error)
        throw error
      }

      if (!data) {
        throw new Error('Failed to create block in database')
      }

      // 成功した場合、ローカル状態にも追加
      const newBlock = {
        id: data.id,
        project_id: data.project_id,
        type: data.type,
        title: data.title,
        description: data.description,
        position: data.position,
        visual_settings: data.visual_settings || {},
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      addBlock(newBlock)
      
      console.log('ブロックが正常に作成されました:', newBlock)
      
    } catch (error: any) {
      console.error('ブロック作成エラー:', error)
      toast.error(`ブロック作成に失敗しました: ${error.message}`)
    }
  }

  // ホイールでのズーム処理
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const oldZoom = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // ズーム計算
    const zoomSpeed = 1.1
    const newZoom = e.evt.deltaY > 0 ? oldZoom / zoomSpeed : oldZoom * zoomSpeed
    const clampedZoom = Math.max(0.1, Math.min(3, newZoom))

    // ズーム中心点の調整
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldZoom,
      y: (pointer.y - stage.y()) / oldZoom,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedZoom,
      y: pointer.y - mousePointTo.y * clampedZoom,
    }

    stage.scale({ x: clampedZoom, y: clampedZoom })
    stage.position(newPos)
    
    setZoom(clampedZoom)
    setPan(newPos)
  }

  // ドラッグでのパン処理
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target as Konva.Stage
    setPan(stage.position())
  }

  return (
    <div className="w-full h-full bg-gray-100 relative overflow-hidden">
      {/* キャンバス */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleCanvasClick}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        draggable={!isCreatingBlock && !isConnecting}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        className={isEditModalOpen ? 'pointer-events-auto' : ''}
      >
        <Layer>
          {/* 接続線を最初に描画（ブロックの下に表示） */}
          {renderConnectionLines()}
          
          {/* ブロック描画 */}
          {blocks.map(block => (
            <BlockComponent
              key={block.id}
              block={block}
              projectId={projectId}
              onEdit={handleEditBlock}
              onDelete={handleDeleteBlock}
              isNextStep={nextStepBlocks.has(block.id)}
              onConnectionStart={handleConnectionStart}
            />
          ))}
        </Layer>
      </Stage>

      {/* 編集モーダル */}
      <BlockEditModal
        block={editingBlock}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
      />

      {/* 削除確認ダイアログ */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ブロックを削除
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                「{deletingBlock?.title}」を削除しますか？この操作は取り消せません。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UI オーバーレイ */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
        <div className="text-sm text-gray-600">
          ズーム: {Math.round(zoom * 100)}%
        </div>
        <div className="text-xs text-gray-500">
          位置: ({Math.round(pan.x)}, {Math.round(pan.y)})
        </div>
        {isConnecting && (
          <div className="text-xs text-blue-600 font-medium">
            接続モード中...
          </div>
        )}
      </div>

      {/* ツールバー */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 flex space-x-2">
        <button
          onClick={() => setIsCreatingBlock(!isCreatingBlock)}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            isCreatingBlock
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          + ブロック
        </button>
        
        <button
          onClick={() => {
            // 接続モードをキャンセル
            if (isConnecting) {
              setIsConnecting(false)
              setConnectingFrom(null)
            }
            
            setZoom(1)
            setPan({ x: 0, y: 0 })
            if (stageRef.current) {
              stageRef.current.scale({ x: 1, y: 1 })
              stageRef.current.position({ x: 0, y: 0 })
            }
          }}
          className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm transition-colors"
        >
          リセット
        </button>
        
        {/* 接続モードキャンセルボタン */}
        {isConnecting && (
          <button
            onClick={() => {
              setIsConnecting(false)
              setConnectingFrom(null)
            }}
            className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm transition-colors"
          >
            接続キャンセル
          </button>
        )}
      </div>

      {/* ブロック作成モードの指示 */}
      {isCreatingBlock && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          クリックしてブロックを作成
        </div>
      )}
      
      {/* 接続モードの指示 */}
      {isConnecting && connectingFrom && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          接続先のブロックの接続点をクリックしてください
        </div>
      )}
    </div>
  )
}