import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'

export interface CommentWithAuthor {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  author: {
    full_name: string
    username: string
  }
}

const COMMENT_WITH_AUTHOR = `
  id, post_id, user_id, content, created_at,
  author:profiles!user_id (full_name, username)
` as const

type RawCommentRow = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  author: { full_name: string; username: string }
}

export async function getComments(
  postId: string
): Promise<ServiceResult<CommentWithAuthor[]>> {
  const { data, error } = await supabase
    .from('post_comments')
    .select(COMMENT_WITH_AUTHOR)
    .eq('post_id', postId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return { data: null, error: error.message }
  return { data: (data as unknown as RawCommentRow[]) as CommentWithAuthor[], error: null }
}

export async function addComment(
  postId: string,
  userId: string,
  content: string
): Promise<ServiceResult<CommentWithAuthor>> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, content: content.trim() })
    .select(COMMENT_WITH_AUTHOR)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as CommentWithAuthor, error: null }
}

export async function deleteComment(
  commentId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function getCommentCount(
  postId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('post_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}
