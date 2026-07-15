// ================================================================
// Gazua Admin Section — TypeScript Types
// ================================================================

import type { ProfileRole, ProfileStatus } from './database'
import type { ContentType, ModerationActionType, ReportReason } from './compliance'

export type AdminRole = ProfileRole
export type UserStatus = ProfileStatus
export type ContentModerationStatus = 'visible' | 'removed'
export type GrowthBucket = 'day' | 'week' | 'month'
export type SortDirection = 'asc' | 'desc'

export interface PaginatedResult<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface UserStats {
  totalUsers: number
  newUsersLast30d: number
  /** Approximation — distinct authors of recent posts/reels/comments/likes, NOT true login
   * activity. `auth.users.last_sign_in_at` requires the service_role key, which correctly
   * never ships to this browser SPA. Surface this caveat in the UI wherever this is shown. */
  activeUsersLast30d: number
  suspendedUsers: number
  creators: number
}

export interface GrowthPoint {
  bucket: string
  newUsers: number
  newCreators: number
}

export interface AdminUserListItem {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  is_creator: boolean
  subscription_tier: string
  role: AdminRole
  status: UserStatus
  created_at: string
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string | null
  handle: string | null
  suspended_at: string | null
  suspended_reason: string | null
  postCount: number
  reelCount: number
  videoCount: number
  followerCount: number
  followingCount: number
}

export interface AdminContentItem {
  id: string
  contentType: 'post' | 'reel' | 'video' | 'comment'
  creatorId: string
  creatorUsername: string | null
  creatorName: string | null
  preview: string
  moderationStatus: ContentModerationStatus
  createdAt: string
}

export interface AdminReportListItem {
  id: string
  reporter_id: string | null
  reporterUsername: string | null
  content_type: ContentType
  content_id: string
  reason: ReportReason
  details: string | null
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  created_at: string
}

export interface AdminModerationActionItem {
  id: string
  moderator_id: string | null
  moderatorUsername: string | null
  report_id: string | null
  content_type: ContentType
  content_id: string
  action: ModerationActionType
  notes: string | null
  created_at: string
}

export interface AdminAuditLogItem {
  id: string
  event_type: string
  user_id: string | null
  actorUsername: string | null
  content_type: string | null
  content_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}
