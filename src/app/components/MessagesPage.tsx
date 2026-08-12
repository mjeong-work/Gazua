import { useState } from 'react';
import { useNavigate } from 'react-router';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppHeader from './AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { useMessages, type ConversationPartner } from '../contexts/MessagesContext';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, avatarUrl, size = 'w-10 h-10' }: { name: string; avatarUrl: string | null; size?: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-600 flex-shrink-0`}>
      {(name[0] ?? '?').toUpperCase()}
    </div>
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, isLoadingConversations, activeThread, openThreadWith, closeThread, sendMessage, markRead } = useMessages();
  const [inputValue, setInputValue] = useState('');

  const handleSelect = (partner: ConversationPartner) => {
    openThreadWith(partner);
    markRead(partner.id);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex flex-1 min-h-0 items-stretch lg:max-w-5xl lg:w-full lg:mx-auto lg:border-x border-neutral-200">
        {/* Conversation list — full-width on mobile when nothing's selected, hidden once a thread is open; always visible alongside the thread on desktop */}
        <div className={`${activeThread ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-72 lg:flex-shrink-0 border-r border-neutral-200 overflow-y-auto`}>
          <div className="px-4 py-4 border-b border-neutral-200 flex-shrink-0">
            <h1 className="text-lg font-bold">Messages</h1>
          </div>
          {isLoadingConversations ? (
            <p className="p-4 text-sm text-neutral-500">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No messages yet. Message a creator from their profile to start a conversation.</p>
          ) : (
            <div className="p-2 space-y-1 pb-16 lg:pb-2">
              {conversations.map(conv => {
                const isSelected = conv.partnerId === activeThread?.partner.id;
                const isUnread = conv.unreadCount > 0;
                return (
                  <button
                    key={conv.partnerId}
                    onClick={() => handleSelect({ id: conv.partnerId, name: conv.partnerName, username: conv.partnerUsername, avatarUrl: conv.partnerAvatarUrl })}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors ${isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                  >
                    <Avatar name={conv.partnerName} avatarUrl={conv.partnerAvatarUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-semibold'}`}>{conv.partnerName}</p>
                        <span className="text-xs text-neutral-400 flex-shrink-0">{formatRelative(conv.lastMessage.created_at)}</span>
                      </div>
                      <p className={`text-xs truncate ${isUnread ? 'text-black font-medium' : 'text-neutral-500'}`}>{conv.lastMessage.content}</p>
                    </div>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Thread — hidden on mobile until a conversation is selected; always visible on desktop */}
        <div className={`${activeThread ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 flex-col`}>
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-neutral-500">Select a conversation to view messages.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 lg:px-5 py-4 border-b border-neutral-200 flex-shrink-0">
                <button onClick={closeThread} className="lg:hidden p-1 -ml-1 hover:bg-neutral-100 rounded-full transition-colors flex-shrink-0" aria-label="Back to conversations">
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </button>
                <Avatar name={activeThread.partner.name} avatarUrl={activeThread.partner.avatarUrl} size="w-9 h-9" />
                <button onClick={() => navigate(`/profile/${activeThread.partner.username}/investment`)} className="text-sm font-semibold hover:underline truncate">
                  {activeThread.partner.name}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
                {activeThread.isLoading ? (
                  <p className="text-sm text-neutral-500">Loading…</p>
                ) : activeThread.messages.length === 0 ? (
                  <p className="text-sm text-neutral-500">No messages yet — say hello!</p>
                ) : (
                  activeThread.messages.map(m => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] lg:max-w-[60%] px-3.5 py-2 rounded-sm text-sm ${isMine ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-800'}`}>
                          {m.content}
                          <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-neutral-400'}`}>{formatRelative(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-200 flex-shrink-0 mb-16 lg:mb-0">
                <input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="p-2.5 lg:p-2 bg-black text-white rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  aria-label="Send"
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
