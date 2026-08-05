import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { isUUID } from './FollowContext';
import {
  getConversations,
  getThread,
  sendMessage as sendMessageService,
  markThreadRead,
  subscribeToMessages,
  type ConversationSummary,
} from '../../lib/services/messages.service';
import type { Message } from '../../types/database';
import { reportServiceError } from '../hooks/useServiceQuery';

export type { ConversationSummary };

export interface ConversationPartner {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ActiveThread {
  partner: ConversationPartner;
  messages: Message[];
  isLoading: boolean;
}

interface MessagesContextType {
  conversations: ConversationSummary[];
  isLoadingConversations: boolean;
  activeThread: ActiveThread | null;
  /** Opens (or resumes) a thread with this partner. A no-op for mock/demo
   * creators (non-UUID ids) — real messaging only ever targets real accounts. */
  openThreadWith: (partner: ConversationPartner) => void;
  closeThread: () => void;
  sendMessage: (text: string) => void;
  markRead: (partnerId: string) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    userIdRef.current = uid;
    setActiveThread(null);
    setConversations([]);

    if (!uid) return;

    setIsLoadingConversations(true);
    const loadConversations = () => {
      getConversations(uid).then(({ data, error }) => {
        setIsLoadingConversations(false);
        if (error) {
          reportServiceError(error, { label: 'your conversations', retry: loadConversations });
          return;
        }
        if (data) setConversations(data);
      });
    };
    loadConversations();

    const channel = subscribeToMessages(uid, (message) => {
      const partnerId = message.sender_id === uid ? message.recipient_id : message.sender_id;
      const isIncomingUnread = message.recipient_id === uid && !message.read_at;

      setConversations(prev => {
        const idx = prev.findIndex(c => c.partnerId === partnerId);
        if (idx === -1) {
          // A new counterpart we have no profile snippet for yet (they only just
          // messaged us for the first time) — re-fetch the full list to pick up
          // their profile info rather than fabricating a partial entry.
          getConversations(uid).then(({ data, error }) => {
            if (error) { reportServiceError(error, { label: 'your conversations' }); return; }
            if (data) setConversations(data);
          });
          return prev;
        }
        const updated = [...prev];
        const [entry] = updated.splice(idx, 1);
        return [{ ...entry, lastMessage: message, unreadCount: entry.unreadCount + (isIncomingUnread ? 1 : 0) }, ...updated];
      });

      setActiveThread(prev => (prev && prev.partner.id === partnerId ? { ...prev, messages: [...prev.messages, message] } : prev));
    }, 'inbox');

    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  const openThreadWith = useCallback((partner: ConversationPartner) => {
    if (!isUUID(partner.id)) return;
    setActiveThread({ partner, messages: [], isLoading: true });

    const uid = userIdRef.current;
    if (!uid) return;
    getThread(uid, partner.id).then(({ data, error }) => {
      setActiveThread(prev => (prev && prev.partner.id === partner.id ? { ...prev, messages: data ?? [], isLoading: false } : prev));
      if (error) {
        reportServiceError(error, { label: `your conversation with ${partner.name}`, retry: () => openThreadWith(partner) });
      }
    });
  }, []);

  const closeThread = useCallback(() => setActiveThread(null), []);

  const sendMessage = useCallback((text: string) => {
    const uid = userIdRef.current;
    const trimmed = text.trim();
    setActiveThread(current => {
      const partner = current?.partner;
      if (!uid || !partner || !trimmed) return current;

      sendMessageService(uid, partner.id, trimmed).then(({ data, error }) => {
        if (error || !data) {
          reportServiceError(error ?? 'Failed to send message.', {
            retry: () => sendMessage(trimmed),
          });
          return;
        }
        setActiveThread(prev => (prev && prev.partner.id === partner.id ? { ...prev, messages: [...prev.messages, data] } : prev));
        setConversations(prev => {
          const idx = prev.findIndex(c => c.partnerId === partner.id);
          if (idx === -1) {
            return [{ partnerId: partner.id, partnerName: partner.name, partnerUsername: partner.name, partnerAvatarUrl: partner.avatarUrl, lastMessage: data, unreadCount: 0 }, ...prev];
          }
          const updated = [...prev];
          const [entry] = updated.splice(idx, 1);
          return [{ ...entry, lastMessage: data }, ...updated];
        });
      });

      return current;
    });
  }, []);

  const markRead = useCallback((partnerId: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    setConversations(prev => prev.map(c => (c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c)));
    markThreadRead(uid, partnerId).catch(() => {});
  }, []);

  return (
    <MessagesContext.Provider
      value={{ conversations, isLoadingConversations, activeThread, openThreadWith, closeThread, sendMessage, markRead }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside <MessagesProvider>');
  return ctx;
}
