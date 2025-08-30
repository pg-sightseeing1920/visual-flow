'use client'

import { useRef, useEffect, useState } from 'react'
import { Rect, Text, Group, Circle } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/lib/store/canvas'
import { createClient } from '@/lib/supabase/client'
import { Block } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

interface BlockComponentProps {
  block: Block
  projectId: string
  onEdit?: (block: Block) => void
  onDelete?: (block: Block) => void
  isNextStep?: boolean
  onConnectionStart?: (blockId: string, anchor: string, position: { x: number; y: number }) => void
}

export const BlockComponent = ({ block, projectId, onEdit, onDelete, isNextStep, onConnectionStart }: BlockComponentProps) => {
  const groupRef = useRef<Konva.Group>(null)
  const glowRef = useRef<Konva.Rect>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  const {
    selectedBlockId,
    setSelectedBlock,
    updateBlock,
    isConnecting,
    connectingFrom,
    setIsConnecting,
    setConnectingFrom,
    addConnection
  } = useCanvasStore()

  const isSelected = selectedBlockId === block.id

  // 次ステップのアニメーション効果
  useEffect(() => {
    if (isNextStep && glowRef.current) {
      const glow = glowRef.current
      
      // パルスアニメーション
      const tween = new Konva.Tween({
        node: glow,
        duration: 1.5,
        opacity: 0.3,
        scaleX: 1.05,
        scaleY: 1.05,
        yoyo: true,
        repeat: -1,
        easing: Konva.Easings.EaseInOut,
      })
      
      tween.play()
      
      return () => tween.destroy()
    }
  }, [isNextStep])

  // ブロックホバーイベント
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  // 接続点クリック処理
  const handleConnectionPointClick = async (anchor: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    
    // 最新の状態を動的に取得
    const currentState = useCanvasStore.getState()
    const { isConnecting: currentIsConnecting, connectingFrom: currentConnectingFrom } = currentState

    console.log('最新の接続状態:', { 
      currentIsConnecting, 
      currentConnectingFrom, 
      blockId: block.id, 
      anchor 
    })
    
    if (!currentIsConnecting) {
      // 接続開始
      console.log('接続開始:', block.id, anchor)
      if (onConnectionStart && groupRef.current) {
        const group = groupRef.current
        const stage = group.getStage()
        if (stage) {
          const worldPos = {
            x: block.position.x + (anchor === 'left' ? 0 : anchor === 'right' ? blockWidth : blockWidth / 2),
            y: block.position.y + (anchor === 'top' ? 0 : anchor === 'bottom' ? blockHeight : blockHeight / 2)
          }
          onConnectionStart(block.id, anchor, worldPos)
        }
      }
    } else if (currentConnectingFrom && currentConnectingFrom.blockId !== block.id) {
      // 接続完了
      console.log('接続完了処理開始:', currentConnectingFrom.blockId, '->', block.id)
      
      try {
        const supabase = createClient()
        const supabaseAny = supabase as any
        
        // 既存の接続をチェック（重複防止）
        const { data: existingConnection } = await supabaseAny
          .from('connections')
          .select('id')
          .eq('source_block_id', currentConnectingFrom.blockId)
          .eq('target_block_id', block.id)
          .single()
        
        if (existingConnection) {
          console.log('接続は既に存在します')
          // 接続モード終了
          setIsConnecting(false)
          setConnectingFrom(null)
          return
        }
        
        // データベースに接続を保存
        const connectionData = {
          project_id: projectId,
          source_block_id: currentConnectingFrom.blockId,
          target_block_id: block.id,
          source_anchor: currentConnectingFrom.anchor,
          target_anchor: anchor
        }
        
        console.log('Supabaseに保存する接続データ:', connectionData)
        
        const { data, error } = await supabaseAny
          .from('connections')
          .insert(connectionData)
          .select()
          .single()
        
        if (error) {
          console.error('接続保存エラー:', error)
          throw error
        }
        
        console.log('Supabaseに保存された接続:', data)
        
        // ローカル状態に接続を追加（直接使用）
        const newConnection = {
          id: data.id,
          project_id: data.project_id,
          source_block_id: data.source_block_id,
          target_block_id: data.target_block_id,
          source_anchor: data.source_anchor,
          target_anchor: data.target_anchor,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
        
        addConnection(newConnection)
        
        // 接続モード終了（直接使用）
        setIsConnecting(false)
        setConnectingFrom(null)
        
        console.log('接続が作成されました:', newConnection)
        toast.success('ブロックを接続しました')
        
      } catch (error: any) {
        console.error('接続作成エラー:', error)
        toast.error(`接続に失敗しました: ${error.message}`)
        
        // エラー時も接続モード終了
        setIsConnecting(false)
        setConnectingFrom(null)
      }
    } else if (currentConnectingFrom && currentConnectingFrom.blockId === block.id) {
      // 同じブロックの場合は接続をキャンセル
      console.log('同じブロックへの接続をキャンセル')
      setIsConnecting(false)
      setConnectingFrom(null)
    }
  }

  // 接続点を描画（ホバー時のみ表示）
  const renderConnectionPoints = () => {
    // 最新の接続状態を取得
    const store = useCanvasStore.getState()
    
    // ホバー時または接続モード時のみ表示
    if (!isHovered && !store.isConnecting) return null
    
    // 接続点をブロックから少し離す
    const offset = 8 // ブロックからの距離
    const points = [
      { anchor: 'top', x: blockWidth / 2, y: -offset },
      { anchor: 'right', x: blockWidth + offset, y: blockHeight / 2 },
      { anchor: 'bottom', x: blockWidth / 2, y: blockHeight + offset },
      { anchor: 'left', x: -offset, y: blockHeight / 2 }
    ]
    
    return points.map(point => (
      <Group key={point.anchor}>
        {/* 接続点周辺の透明なホバーエリア */}
        <Circle
          x={point.x}
          y={point.y}
          radius={12} // 接続点より大きな透明エリア
          fill="transparent"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* 実際の接続点 */}
        <Circle
          x={point.x}
          y={point.y}
          radius={6}
          fill={store.isConnecting && store.connectingFrom?.blockId === block.id ? "#FFD700" : "#3B82F6"} // 接続開始ブロックは金色
          stroke="white"
          strokeWidth={2}
          opacity={0.8}
          onClick={(e) => handleConnectionPointClick(point.anchor, e)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </Group>
    ))
  }

  // ブロックタイプに応じた色設定
  const getBlockColor = (type: string, status: string) => {
    const baseColors = {
      goal: '#3B82F6',      // 青
      task: '#10B981',      // 緑
      note: '#F59E0B',      // 黄色
      decision: '#8B5CF6',  // 紫
    }
    
    const statusModifiers = {
      pending: { opacity: 1, brightness: 1 },
      in_progress: { opacity: 1, brightness: 1.2 },
      completed: { opacity: 0.6, brightness: 0.8 },
      paused: { opacity: 0.7, brightness: 0.9 },
      cancelled: { opacity: 0.4, brightness: 0.7 },
    }
    
    const baseColor = baseColors[type as keyof typeof baseColors] || '#6B7280'
    const modifier = statusModifiers[status as keyof typeof statusModifiers] || statusModifiers.pending
    
    // 完了状態の場合は緑がかった色に変更
    let finalColor = baseColor
    if (status === 'completed') {
      finalColor = '#059669' // より濃い緑
    } else if (status === 'in_progress') {
      finalColor = '#2563EB' // より濃い青
    }
    
    return {
      fill: finalColor,
      opacity: modifier.opacity,
      shadowColor: status === 'completed' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(0,0,0,0.1)',
      shadowBlur: status === 'completed' ? 8 : 4,
    }
  }

  const blockStyle = getBlockColor(block.type, block.status)

  // ブロッククリック処理
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    setSelectedBlock(block.id)
  }

  // ドラッグ開始処理
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    // イベントのバブリングを停止してStageに伝播させない
    e.cancelBubble = true
    
    const group = e.target as Konva.Group
    const stage = group.getStage()
    
    // Stageのドラッグを一時的に無効化
    if (stage) {
      stage.draggable(false)
    }
  }

  // ドラッグ中の処理
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // イベントのバブリングを停止
    e.cancelBubble = true
  }

  // ドラッグ終了処理
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    // イベントのバブリングを停止
    e.cancelBubble = true
    
    const group = e.target as Konva.Group
    const stage = group.getStage()
    
    // Stageのドラッグを復元（少し遅延させる）
    setTimeout(() => {
      if (stage) {
        stage.draggable(true)
      }
    }, 50)
    
    // 現在のスクリーン座標を取得
    const currentPos = group.position()
    
    // そのままの座標を使用（ステージの変換は考慮しない）
    const newPosition = {
      x: Math.round(currentPos.x),
      y: Math.round(currentPos.y)
    }
    
    try {
      // Supabaseクライアント取得
      const supabase = createClient()
      
      // より安全な型アサーション
      const supabaseAny = supabase as any
      const { error } = await supabaseAny
        .from('blocks')
        .update({ position: newPosition })
        .eq('id', block.id)

      if (error) {
        console.error('Position update error:', error)
        throw error
      }

      // 成功したらローカル状態も更新
      updateBlock(block.id, {
        position: newPosition
      })
      
      console.log(`ブロック ${block.id} の位置を更新:`, newPosition)
      
    } catch (error: any) {
      console.error('位置更新エラー:', error)
      // エラーの場合は元の位置に戻す
      group.position(block.position)
    }
  }

  // ダブルクリックで編集モード
  const handleDoubleClick = () => {
    // 親コンポーネントに編集モーダルを開くよう通知
    if (onEdit) {
      onEdit(block)
    }
  }

  // 削除ハンドラー
  const handleDelete = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    
    if (onDelete) {
      onDelete(block)
    }
  }

  const blockWidth = 160
  const blockHeight = 80
  const padding = 12
  // const hoverOffset = 8

  return (
    <Group
      ref={groupRef}
      x={block.position.x}
      y={block.position.y}
      draggable
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 次ステップ用のグロー効果 */}
      {isNextStep && (
        <Rect
          ref={glowRef}
          x={-4}
          y={-4}
          width={blockWidth + 8}
          height={blockHeight + 8}
          fill="#FFD700"
          opacity={0.1}
          cornerRadius={12}
          shadowColor="#FFD700"
          shadowBlur={12}
          shadowOffset={{ x: 0, y: 0 }}
        />
      )}
      
      {/* ブロック本体 */}
      <Rect
        // x={-hoverOffset}
        // y={-hoverOffset}
        width={blockWidth}
        height={blockHeight}
        fill={blockStyle.fill}
        opacity={blockStyle.opacity}
        cornerRadius={8}
        stroke={isSelected ? '#1F2937' : isNextStep ? '#FFD700' : 'transparent'}
        strokeWidth={isSelected ? 2 : isNextStep ? 3 : 0}
        shadowColor={blockStyle.shadowColor}
        shadowBlur={blockStyle.shadowBlur}
        shadowOffset={{ x: 0, y: 2 }}
      />
      
      {/* タイトルテキスト */}
      <Text
        x={padding}
        y={padding}
        text={block.title}
        fontSize={14}
        fontFamily="Arial, sans-serif"
        fontStyle="bold"
        fill="white"
        width={blockWidth - padding * 2}
        height={20}
        ellipsis={true}
      />
      
      {/* 説明テキスト */}
      {block.description && (
        <Text
          x={padding}
          y={padding + 22}
          text={block.description}
          fontSize={11}
          fontFamily="Arial, sans-serif"
          fill="rgba(255,255,255,0.9)"
          width={blockWidth - padding * 2}
          height={blockHeight - padding * 2 - 22}
          ellipsis={true}
        />
      )}
      
      {/* ステータスインジケーター */}
      <Rect
        x={blockWidth - 16}
        y={8}
        width={8}
        height={8}
        fill={block.status === 'completed' ? '#10B981' : 
              block.status === 'in_progress' ? '#F59E0B' : 
              '#6B7280'}
        cornerRadius={4}
      />
      
      {/* 選択時の追加UI */}
      {isSelected && (
        <>
          {/* 削除ボタン */}
          <Rect
            x={blockWidth - 24}
            y={-12}
            width={20}
            height={20}
            fill="#EF4444"
            cornerRadius={10}
            onClick={handleDelete}
          />
          <Text
            x={blockWidth - 19}
            y={-7}
            text="×"
            fontSize={12}
            fill="white"
            onClick={handleDelete}
          />
        </>
      )}
      
      {/* 接続点を描画 */}
      {renderConnectionPoints()}
    </Group>
  )
}