import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'

export type ReelCommentContentType = 'reel' | 'video'

export interface ReelCommentWithAuthor {
  id: string
  content_type: ReelCommentContentType
  content_id: string
  user_id: string
  content: string
  created_at: string
  author: {
    full_name: string
    username: string
  }
}

const REEL_COMMENT_WITH_AUTHOR = `
  id, content_type, content_id, user_id, content, created_at,
  author:profiles!user_id (full_name, username)
` as const

type RawReelCommentRow = {
  id: string
  content_type: ReelCommentContentType
  content_id: string
  user_id: string
  content: string
  created_at: string
  author: { full_name: string; username: string }
}

export async function getReelComments(
  contentType: ReelCommentContentType,
  contentId: string
): Promise<ServiceResult<ReelCommentWithAuthor[]>> {
  const { data, error } = await supabase
    .from('reel_comments')
    .select(REEL_COMMENT_WITH_AUTHOR)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return { data: null, error: error.message }
  return { data: (data as unknown as RawReelCommentRow[]) as ReelCommentWithAuthor[], error: null }
}

export async function addReelComment(
  contentType: ReelCommentContentType,
  contentId: string,
  userId: string,
  content: string
): Promise<ServiceResult<ReelCommentWithAuthor>> {
  const { data, error } = await supabase
    .from('reel_comments')
    .insert({ content_type: contentType, content_id: contentId, user_id: userId, content: content.trim() })
    .select(REEL_COMMENT_WITH_AUTHOR)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as ReelCommentWithAuthor, error: null }
}

export async function deleteReelComment(
  commentId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('reel_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function getReelCommentCount(
  contentType: ReelCommentContentType,
  contentId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('reel_comments')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('moderation_status', 'visible')

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}
