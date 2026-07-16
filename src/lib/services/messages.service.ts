import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Message } from '../../types/database'

interface MessageProfileSnippet {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
}

const MESSAGE_WITH_PROFILES = `
  *,
  sender:profiles!sender_id (id, username, full_name, avatar_url),
  recipient:profiles!recipient_id (id, username, full_name, avatar_url)
` as const

type MessageWithProfiles = Message & {
  sender: MessageProfileSnippet
  recipient: MessageProfileSnippet
}

export interface ConversationSummary {
  partnerId: string
  partnerName: string
  partnerUsername: string
  partnerAvatarUrl: string | null
  lastMessage: Message
  unreadCount: number
}

// ── getConversations ──────────────────────────────────────────────
/**
 * Fetch the authenticated user's DM inbox: one row per counterpart,
 * with their profile snippet, last message, and unread count, newest
 * first. A "conversation" isn't a stored entity — it's derived
 * client-side from the flat `messages` table, grouped by whichever
 * side of each row isn't the caller's own id.
 */
export async function getConversations(userId: string): Promise<ServiceResult<ConversationSummary[]>> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_WITH_PROFILES)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return { data: null, error: error.message }

  const byPartner = new Map<string, ConversationSummary>()
  for (const msg of (data as unknown as MessageWithProfiles[]) ?? []) {
    const isOwnSender = msg.sender_id === userId
    const partner = isOwnSender ? msg.recipient : msg.sender
    const isUnread = msg.recipient_id === userId && !msg.read_at

    const existing = byPartner.get(partner.id)
    if (!existing) {
      byPartner.set(partner.id, {
        partnerId: partner.id,
        partnerName: partner.full_name,
        partnerUsername: partner.username,
        partnerAvatarUrl: partner.avatar_url,
        lastMessage: msg,
        unreadCount: isUnread ? 1 : 0,
      })
    } else if (isUnread) {
      existing.unreadCount += 1
    }
  }

  return { data: [...byPartner.values()], error: null }
}

// ── getThread ──────────────────────────────────────────────────────
/** Full message history between the authenticated user and one other user, oldest first. */
export async function getThread(userId: string, otherUserId: string): Promise<ServiceResult<Message[]>> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── sendMessage ──────────────────────────────────────────────────────
export async function sendMessage(
  senderId: string,
  recipientId: string,
  content: string
): Promise<ServiceResult<Message>> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, content })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── markThreadRead ───────────────────────────────────────────────────
/** Marks every unread message from `otherUserId` to the authenticated user as read. */
export async function markThreadRead(userId: string, otherUserId: string): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('sender_id', otherUserId)
    .is('read_at', null)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── getUnreadMessageCount ────────────────────────────────────────────
/** Used for the unread badge next to "Messages" in AppHeader. */
export async function getUnreadMessageCount(userId: string): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}

// ── subscribeToMessages ──────────────────────────────────────────────
/**
 * Realtime subscription for new incoming messages. Call once the user is
 * authenticated; call `.unsubscribe()` on the returned channel when done.
 *
 * `channelKey` must be unique per independent subscriber (e.g. AppHeader's
 * unread badge vs. MessagesContext's inbox) — Supabase reuses a channel by
 * topic name, and calling `.on()` again after a channel already
 * `.subscribe()`d throws, so two consumers can't share one topic.
 */
export function subscribeToMessages(userId: string, onNew: (message: Message) => void, channelKey = 'default') {
  return supabase
    .channel(`messages:${channelKey}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      payload => onNew(payload.new as Message)
    )
    .subscribe()
}
