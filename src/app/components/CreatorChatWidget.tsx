import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import SendIcon from '@mui/icons-material/Send';
import { useMessages } from '../contexts/MessagesContext';

interface CreatorChatWidgetProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  onClose: () => void;
}

/**
 * Floating chat widget — UI only for now (no real backend), but conversations persist via
 * MessagesContext (localStorage-backed) so they survive closing the widget and are visible
 * from the /messages inbox. Reusable so it can be triggered from anywhere a creator is known
 * (e.g. the profile page's Message button today, the sidebar's My Creators list later):
 * render `<CreatorChatWidget key={creatorId} .../>` keyed by creator so switching creators
 * shows that creator's own thread.
 */
export default function CreatorChatWidget({ creatorId, creatorName, creatorAvatar, onClose }: CreatorChatWidgetProps) {
  const { conversations, startConversation, sendMessage } = useMessages();
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const messages = conversations[creatorId]?.messages ?? [];

  // Seeds the conversation with the creator's opener the first time it's opened — a no-op if
  // this creator's thread already exists (e.g. re-opening a chat you'd already started).
  useEffect(() => {
    startConversation(creatorId, creatorName, creatorAvatar);
  }, [creatorId, creatorName, creatorAvatar, startConversation]);

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
    sendMessage(creatorId, inputValue.trim());
    setInputValue('');
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl border-t border-gray-200 bg-white shadow-xl flex flex-col overflow-hidden transition-all duration-300
        lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-80 lg:rounded-2xl lg:border
        ${isMinimized ? 'h-auto' : 'h-[60vh] lg:h-[380px]'}
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg flex-shrink-0">
            {creatorAvatar}
          </div>
          <span className="text-sm font-semibold truncate">Chat with {creatorName}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setIsMinimized(v => !v)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label={isMinimized ? 'Expand' : 'Minimize'}>
            <RemoveIcon sx={{ fontSize: 16 }} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-200 flex-shrink-0">
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-black transition-colors"
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
