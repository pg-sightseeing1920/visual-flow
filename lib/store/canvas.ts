// lib/store/canvas.ts - Phase 2統合版（既存機能保持）

import { create } from 'zustand'
import { Block, Connection, PresenceData } from '@/lib/supabase/client'

type ConnectionPoint = {
  blockId: string
  anchor: 'top' | 'right' | 'bottom' | 'left'
  position: { x: number; y: number }
}

interface CanvasState {
  // ===== Phase 1 既存機能（保持） =====
  // キャンバス状態
  zoom: number
  pan: { x: number; y: number }
  
  // ブロック関連
  blocks: Block[]
  selectedBlockId: string | null
  hoveredBlockId: string | null
  
  // 接続関連
  connections: Connection[]
  isConnecting: boolean
  connectingFrom: ConnectionPoint | null
  
  // UI状態
  isCreatingBlock: boolean
  draggedBlock: Block | null
  
  // ===== Phase 2 新機能 =====
  // プレゼンス（他のユーザーの状態）
  presences: Record<string, PresenceData>
  
  // コメント状態
  activeCommentBlockId: string | null
  
  // 権限管理
  canEdit: boolean
  canComment: boolean
  
  // ===== Phase 1 既存アクション（保持） =====
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setBlocks: (blocks: Block[]) => void
  addBlock: (block: Block) => void
  updateBlock: (id: string, updates: Partial<Block>) => void
  deleteBlock: (id: string) => void
  setSelectedBlock: (id: string | null) => void
  setIsCreatingBlock: (isCreating: boolean) => void
  setDraggedBlock: (block: Block | null) => void
  
  // 接続アクション
  setConnections: (connections: Connection[]) => void
  addConnection: (connection: Connection) => void
  deleteConnection: (id: string) => void
  setIsConnecting: (isConnecting: boolean) => void
  setConnectingFrom: (from: ConnectionPoint | null) => void
  setHoveredBlockId: (id: string | null) => void
  
  // 計算されたプロパティ
  getBlockById: (id: string) => Block | undefined
  
  // ===== Phase 2 新アクション =====
  // プレゼンス管理
  setPresences: (presences: Record<string, PresenceData>) => void
  updatePresence: (userId: string, presence: PresenceData) => void
  removePresence: (userId: string) => void
  
  // コメント管理
  setActiveCommentBlock: (blockId: string | null) => void
  
  // 権限管理
  setPermissions: (canEdit: boolean, canComment: boolean) => void
  
  // リアルタイム用のブロック更新（直接Block渡し版）
  updateBlockDirect: (updatedBlock: Block) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // ===== Phase 1 初期状態（保持） =====
  zoom: 1,
  pan: { x: 0, y: 0 },
  blocks: [],
  selectedBlockId: null,
  hoveredBlockId: null,
  connections: [],
  isConnecting: false,
  connectingFrom: null,
  isCreatingBlock: false,
  draggedBlock: null,

  // ===== Phase 2 初期状態 =====
  presences: {},
  activeCommentBlockId: null,
  canEdit: true,
  canComment: true,

  // ===== Phase 1 アクション（保持） =====
  setZoom: (zoom: number) => set({ zoom }),
  setPan: (pan: { x: number; y: number }) => set({ pan }),
  
  setBlocks: (blocks: Block[]) => set({ blocks }),
  
  addBlock: (block: Block) => 
    set(state => ({ blocks: [...state.blocks, block] })),
  
  updateBlock: (id: string, updates: Partial<Block>) =>
    set(state => ({
      blocks: state.blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      )
    })),
  
  deleteBlock: (id: string) =>
    set(state => ({
      blocks: state.blocks.filter(block => block.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
      activeCommentBlockId: state.activeCommentBlockId === id ? null : state.activeCommentBlockId,
      connections: state.connections.filter(conn => 
        conn.source_block_id !== id && conn.target_block_id !== id
      )
    })),
  
  setSelectedBlock: (id: string | null) => set({ selectedBlockId: id }),
  setIsCreatingBlock: (isCreating: boolean) => set({ isCreatingBlock: isCreating }),
  setDraggedBlock: (block: Block | null) => set({ draggedBlock: block }),
  
  // 接続アクション
  setConnections: (connections: Connection[]) => set({ connections }),
  
  addConnection: (connection: Connection) =>
    set(state => ({ connections: [...state.connections, connection] })),
  
  deleteConnection: (id: string) =>
    set(state => ({
      connections: state.connections.filter(conn => conn.id !== id)
    })),
  
  setIsConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setConnectingFrom: (from: ConnectionPoint | null) => set({ connectingFrom: from }),
  setHoveredBlockId: (id: string | null) => set({ hoveredBlockId: id }),
  
  // 計算されたプロパティ
  getBlockById: (id: string) => get().blocks.find(block => block.id === id),

  // ===== Phase 2 新アクション =====
  // プレゼンス管理
  setPresences: (presences: Record<string, PresenceData>) => set({ presences }),
  
  updatePresence: (userId: string, presence: PresenceData) => set((state) => ({
    presences: {
      ...state.presences,
      [userId]: presence
    }
  })),
  
  removePresence: (userId: string) => set((state) => {
    const newPresences = { ...state.presences }
    delete newPresences[userId]
    return { presences: newPresences }
  }),

  // コメント管理
  setActiveCommentBlock: (blockId: string | null) => set({ activeCommentBlockId: blockId }),

  // 権限管理
  setPermissions: (canEdit: boolean, canComment: boolean) => set({ canEdit, canComment }),

  // リアルタイム用のブロック更新（直接Block渡し版）
  updateBlockDirect: (updatedBlock: Block) => set((state) => ({
    blocks: state.blocks.map(block =>
      block.id === updatedBlock.id ? updatedBlock : block
    )
  })),
}))