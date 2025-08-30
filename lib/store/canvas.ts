// lib/store/canvas.ts - 型を修正した完全版

import { create } from 'zustand'
import { Block, Connection } from '@/lib/supabase/client'

interface CanvasState {
  // キャンバス状態
  zoom: number
  pan: { x: number; y: number }
  
  // ブロック関連
  blocks: Block[]
  selectedBlockId: string | null
  
  // 接続関連（型を修正）
  connections: Connection[]
  isConnecting: boolean
  connectingFrom: { 
    blockId: string; 
    anchor: string; 
    position: { x: number; y: number } // ← position を追加
  } | null
  hoveredBlockId: string | null
  
  // UI状態
  isCreatingBlock: boolean
  draggedBlock: Block | null
  
  // アクション
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setBlocks: (blocks: Block[]) => void
  addBlock: (block: Block) => void
  updateBlock: (id: string, updates: Partial<Block>) => void
  deleteBlock: (id: string) => void
  setSelectedBlock: (id: string | null) => void
  setIsCreatingBlock: (isCreating: boolean) => void
  setDraggedBlock: (block: Block | null) => void
  
  // 接続アクション（型を修正）
  setConnections: (connections: Connection[]) => void
  addConnection: (connection: Connection) => void
  deleteConnection: (id: string) => void
  setIsConnecting: (isConnecting: boolean) => void
  setConnectingFrom: (from: { 
    blockId: string; 
    anchor: string; 
    position: { x: number; y: number } 
  } | null) => void
  setHoveredBlockId: (id: string | null) => void
  
  // 計算されたプロパティ
  getBlockById: (id: string) => Block | undefined
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // 初期状態
  zoom: 1,
  pan: { x: 0, y: 0 },
  blocks: [],
  selectedBlockId: null,
  connections: [],
  isConnecting: false,
  connectingFrom: null,
  hoveredBlockId: null,
  isCreatingBlock: false,
  draggedBlock: null,

  // アクション
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
  
  setConnectingFrom: (from: { 
    blockId: string; 
    anchor: string; 
    position: { x: number; y: number } 
  } | null) => set({ connectingFrom: from }),
  
  setHoveredBlockId: (id: string | null) => set({ hoveredBlockId: id }),
  
  // 計算されたプロパティ
  getBlockById: (id: string) => get().blocks.find(block => block.id === id),
}))