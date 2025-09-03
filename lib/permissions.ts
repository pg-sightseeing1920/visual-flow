// lib/permissions.ts - 権限管理システム

import { ProjectRole, ProjectPermissions } from '@/lib/supabase/client'
import React, { useMemo } from 'react'

/**
 * プロジェクトの権限レベル定義
 * owner > admin > editor > viewer
 */
export const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
}

/**
 * 役割に基づく権限を計算
 */
export function getProjectPermissions(role: ProjectRole): ProjectPermissions {
  switch (role) {
    case 'owner':
      return {
        canView: true,
        canEdit: true,
        canComment: true,
        canInvite: true,
        canDelete: true,
      }
    case 'admin':
      return {
        canView: true,
        canEdit: true,
        canComment: true,
        canInvite: true,
        canDelete: false,
      }
    case 'editor':
      return {
        canView: true,
        canEdit: true,
        canComment: true,
        canInvite: false,
        canDelete: false,
      }
    case 'viewer':
      return {
        canView: true,
        canEdit: false,
        canComment: true,
        canInvite: false,
        canDelete: false,
      }
    default:
      return {
        canView: false,
        canEdit: false,
        canComment: false,
        canInvite: false,
        canDelete: false,
      }
  }
}

/**
 * 権限レベルを比較
 */
export function hasHigherRole(currentRole: ProjectRole, requiredRole: ProjectRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * 権限チェックのヘルパー関数群
 */
export class PermissionChecker {
  constructor(private role: ProjectRole) {}

  canView(): boolean {
    return this.role !== undefined && ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.viewer
  }

  canEdit(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.editor
  }

  canComment(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.viewer
  }

  canInvite(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.admin
  }

  canDelete(): boolean {
    return this.role === 'owner'
  }

  canManageMembers(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.admin
  }

  canUpdateProject(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.admin
  }

  canCreateBlocks(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.editor
  }

  canEditBlocks(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.editor
  }

  canDeleteBlocks(): boolean {
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY.editor
  }
}

/**
 * 権限ベースのUIコンポーネント制御
 */
export function withPermission<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    requiredRole: ProjectRole,
    currentRole?: ProjectRole
  ): React.ComponentType<T> {
    return (props: T) => {
      if (!currentRole || !hasHigherRole(currentRole, requiredRole)) {
        return null
      }
      // 型アサーションでエラーを回避
      const ComponentAsElement = Component as React.ComponentType<T>
      return React.createElement(ComponentAsElement, props)
    }
  }

/**
 * 権限チェック用のカスタムフック
 */
export function useProjectPermissions(role?: ProjectRole) {
  return useMemo(() => {
    if (!role) {
      return {
        permissions: getProjectPermissions('viewer'), // デフォルトは最小権限
        checker: new PermissionChecker('viewer'),
      }
    }

    return {
      permissions: getProjectPermissions(role),
      checker: new PermissionChecker(role),
    }
  }, [role])
}