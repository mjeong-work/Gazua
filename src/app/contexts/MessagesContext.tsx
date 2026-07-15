import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { MOCK_CONVERSATIONS, type ChatMessage, type Conversation } from '../data/messages';

export type { ChatMessage, Conversation };

const MESSAGES_KEY = 'gazua:messages';

function readConversations(): Record<string, Conversation> {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    // No saved state yet (first visit) — seed with the mock conversations so /messages
    // isn't empty; once the user sends/receives anything, their real state takes over.
    return raw ? (JSON.parse(raw) as Record<string, Conversation>) : MOCK_CONVERSATIONS;
  } catch {
    return MOCK_CONVERSATIONS;
  }
}

function writeConversations(data: Record<string, Conversation>): void {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(data));
  } catch {
    // storage quota exceeded or private-browsing restriction — ignore
  }
}

interface MessagesContextType {
  /** All conversations, keyed by creator id (slug). */
  conversations: Record<string, Conversation>;
  /** Ensures a conversation exists for this creator, seeding it with their opener message the first time. Safe to call every time a chat is opened — a no-op if the conversation already exists. */
  startConversation: (creatorId: string, creatorName: string, creatorAvatar: string) => void;
  /** Appends a message the user sent to the given creator's thread. */
  sendMessage: (creatorId: string, text: string) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Record<string, Conversation>>(() => readConversations());

  useEffect(() => {
    writeConversations(conversations);
  }, [conversations]);

  const startConversation = useCallback((creatorId: string, creatorName: string, creatorAvatar: string) => {
    setConversations(prev => {
      if (prev[creatorId]) return prev;
      const opener: ChatMessage = {
        id: `${Date.now()}`,
        from: 'creator',
        text: `Hi! I'm ${creatorName}. Ask me anything about my investment approach.`,
        timestamp: new Date().toISOString(),
      };
      return { ...prev, [creatorId]: { creatorId, creatorName, creatorAvatar, messages: [opener] } };
    });
  }, []);

  const sendMessage = useCallback((creatorId: string, text: string) => {
    setConversations(prev => {
      const existing = prev[creatorId];
      if (!existing) return prev;
      const message: ChatMessage = { id: `${Date.now()}`, from: 'user', text, timestamp: new Date().toISOString() };
      return { ...prev, [creatorId]: { ...existing, messages: [...existing.messages, message] } };
    });
  }, []);

  return (
    <MessagesContext.Provider value={{ conversations, startConversation, sendMessage }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside <MessagesProvider>');
  return ctx;
}
