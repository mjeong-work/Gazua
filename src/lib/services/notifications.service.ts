import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Notification } from '../../types/database'

// ── getNotifications ─────────────────────────────────────────────
/**
 * Fetch all notifications for the authenticated user, newest first.
 * RLS ensures only the owner's notifications are returned.
 * Replaces MOCK_NOTIFICATIONS in data/notifications.ts.
 */
export async function getNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<ServiceResult<Notification[]>> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── getUnreadCount ───────────────────────────────────────────────
/**
 * Returns the count of unread notifications.
 * Used for the notification badge in AppHeader.
 */
export async function getUnreadCount(userId: string): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}

// ── markAsRead ───────────────────────────────────────────────────
/**
 * Mark a single notification as read.
 * RLS ensures users can only update their own notifications.
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── markAllAsRead ────────────────────────────────────────────────
/**
 * Mark all of a user's notifications as read in one round-trip.
 * Used by "Mark all as read" button in NotificationsPage.
 */
export async function markAllAsRead(userId: string): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── subscribeToNotifications ─────────────────────────────────────
/**
 * Sets up a Supabase Realtime subscription for new notifications.
 * Call this once when the user is authenticated.
 * Returns the channel object — call `.unsubscribe()` on it when done.
 *
 * Usage:
 *   const channel = subscribeToNotifications(userId, (n) => {
 *     setNotifications(prev => [n, ...prev])
 *   })
 *   return () => channel.unsubscribe()
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (notification: Notification) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      payload => onNew(payload.new as Notification)
    )
    .subscribe()
}
