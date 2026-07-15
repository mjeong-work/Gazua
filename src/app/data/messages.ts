export interface ChatMessage {
  id: string;
  from: 'creator' | 'user';
  text: string;
  timestamp: string;
}

export interface Conversation {
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  messages: ChatMessage[];
}

// Relative to "now" (not fixed dates) so the demo always reads as recent, no matter when
// the app is actually opened.
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const MOCK_CONVERSATIONS: Record<string, Conversation> = {
  'sarah-chen': {
    creatorId: 'sarah-chen',
    creatorName: 'Sarah Chen',
    creatorAvatar: '👩‍💼',
    messages: [
      { id: 'sc-1', from: 'creator', text: "Hi! I'm Sarah Chen. Ask me anything about my investment approach.", timestamp: minutesAgo(180) },
      { id: 'sc-2', from: 'user', text: "Hey Sarah, what's your take on semiconductor stocks right now?", timestamp: minutesAgo(175) },
      { id: 'sc-3', from: 'creator', text: "Still bullish long-term, but I'd wait for a pullback before adding to positions — valuations are stretched after this run.", timestamp: minutesAgo(170) },
      { id: 'sc-4', from: 'user', text: "That's helpful, thanks!", timestamp: minutesAgo(30) },
    ],
  },
  'alex-rodriguez': {
    creatorId: 'alex-rodriguez',
    creatorName: 'Alex Rodriguez',
    creatorAvatar: '👨‍💼',
    messages: [
      { id: 'ar-1', from: 'creator', text: "Hi! I'm Alex Rodriguez. Ask me anything about my investment approach.", timestamp: minutesAgo(1500) },
      { id: 'ar-2', from: 'user', text: 'Do you have a beginner-friendly guide to getting started with index funds?', timestamp: minutesAgo(1440) },
      { id: 'ar-3', from: 'creator', text: 'Check out my "5 Stocks I\'m Buying in 2026" video — I break down my whole starter portfolio there.', timestamp: minutesAgo(1430) },
    ],
  },
  'mike-ross': {
    creatorId: 'mike-ross',
    creatorName: 'Mike Ross',
    creatorAvatar: '👨‍💻',
    messages: [
      { id: 'mr-1', from: 'creator', text: "Hi! I'm Mike Ross. Ask me anything about my investment approach.", timestamp: minutesAgo(4300) },
      { id: 'mr-2', from: 'user', text: 'What backtesting framework do you use for your Python strategies?', timestamp: minutesAgo(4290) },
      { id: 'mr-3', from: 'creator', text: "I mostly use a custom pandas-based backtester, but backtrader is a solid open-source option if you're starting out.", timestamp: minutesAgo(4280) },
    ],
  },
};
