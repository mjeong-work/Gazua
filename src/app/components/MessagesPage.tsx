import { useState } from 'react';
import { useNavigate } from 'react-router';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppHeader from './AppHeader';
import { useMessages } from '../contexts/MessagesContext';

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversations, sendMessage } = useMessages();

  const conversationList = Object.values(conversations).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.timestamp ?? '';
    const bLast = b.messages[b.messages.length - 1]?.timestamp ?? '';
    return bLast.localeCompare(aLast);
  });

  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(conversationList[0]?.creatorId ?? null);
  const [inputValue, setInputValue] = useState('');

  const selected = selectedCreatorId ? conversations[selectedCreatorId] : undefined;

  const handleSend = () => {
    if (!inputValue.trim() || !selectedCreatorId) return;
    sendMessage(selectedCreatorId, inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex flex-1 min-h-0 items-stretch lg:max-w-5xl lg:w-full lg:mx-auto lg:border-x border-gray-200">
        {/* Conversation list — full-width on mobile when nothing's selected, hidden once a thread is open; always visible alongside the thread on desktop */}
        <div className={`${selectedCreatorId ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-72 lg:flex-shrink-0 border-r border-gray-200 overflow-y-auto`}>
          <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
            <h1 className="text-lg font-bold">Messages</h1>
          </div>
          {conversationList.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No messages yet. Message a creator from their profile to start a conversation.</p>
          ) : (
            <div className="p-2 space-y-1 pb-16 lg:pb-2">
              {conversationList.map(conv => {
                const last = conv.messages[conv.messages.length - 1];
                const isSelected = conv.creatorId === selectedCreatorId;
                return (
                  <button
                    key={conv.creatorId}
                    onClick={() => setSelectedCreatorId(conv.creatorId)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                      {conv.creatorAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{conv.creatorName}</p>
                      {last && <p className="text-xs text-gray-500 truncate">{last.text}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Thread — hidden on mobile until a conversation is selected; always visible on desktop */}
        <div className={`${selectedCreatorId ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 flex-col`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-500">Select a conversation to view messages.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 lg:px-5 py-4 border-b border-gray-200 flex-shrink-0">
                <button onClick={() => setSelectedCreatorId(null)} className="lg:hidden p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0" aria-label="Back to conversations">
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </button>
                <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                  {selected.creatorAvatar}
                </div>
                <button onClick={() => navigate(`/profile/${selected.creatorId}/investment`)} className="text-sm font-semibold hover:underline truncate">
                  {selected.creatorName}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
                {selected.messages.map(m => (
                  <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] lg:max-w-[60%] px-3.5 py-2 rounded-2xl text-sm ${m.from === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0 mb-16 lg:mb-0">
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
