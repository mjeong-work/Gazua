import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../contexts/MessagesContext';

interface CreatorChatWidgetProps {
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  onClose: () => void;
}

/**
 * Floating chat widget, real-backend (Supabase `messages` table) via MessagesContext.
 * `creatorId` must be the creator's real profile UUID — callers only render this widget
 * when a real (DB-backed) profile is available, since there's nothing real to message
 * for a mock/demo creator.
 */
export default function CreatorChatWidget({ creatorId, creatorName, creatorUsername, creatorAvatarUrl, onClose }: CreatorChatWidgetProps) {
  const { user } = useAuth();
  const { activeThread, openThreadWith, sendMessage, markRead } = useMessages();
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const messages = activeThread?.partner.id === creatorId ? activeThread.messages : [];

  // Opens (or resumes) this creator's thread the first time the widget is shown.
  useEffect(() => {
    openThreadWith({ id: creatorId, name: creatorName, username: creatorUsername, avatarUrl: creatorAvatarUrl });
    markRead(creatorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId, creatorName, creatorUsername, creatorAvatarUrl]);

  // Mount-then-animate so the enter transition actually plays (starting at the "open" state
  // would skip straight past it — the transition needs a frame at the "closed" state first).
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl border-t border-neutral-200 bg-white shadow-xl flex flex-col overflow-hidden transition-all duration-300
        lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-80 lg:rounded-2xl lg:border
        ${isMinimized ? 'h-auto' : 'h-[60vh] lg:h-[380px]'}
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {creatorAvatarUrl ? (
            <img src={creatorAvatarUrl} alt={creatorName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-600 flex-shrink-0">
              {(creatorName[0] ?? '?').toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold truncate">Chat with {creatorName}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setIsMinimized(v => !v)} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors" aria-label={isMinimized ? 'Expand' : 'Minimize'}>
            <RemoveIcon sx={{ fontSize: 16 }} />
          </button>
          <button onClick={onClose} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors" aria-label="Close">
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.length === 0 && (
              <p className="text-sm text-neutral-500 text-center mt-4">No messages yet — say hello!</p>
            )}
            {messages.map(m => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-800'}`}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-neutral-200 flex-shrink-0">
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-neutral-200 rounded-full text-sm focus:outline-none focus:border-black transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-2 bg-black text-white rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send"
            >
              <SendIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
