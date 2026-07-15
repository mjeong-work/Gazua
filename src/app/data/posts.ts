export interface Post {
  id: number;
  /** Supabase UUID — present for DB-backed posts, undefined for mock posts. */
  db_id?: string;
  creator: string;
  creator_id: string;
  avatar: string;
  verified: boolean;
  asset: string;
  category: string;
  created_at: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  time_horizon: 'Short-term' | 'Medium-term' | 'Long-term';
  risk_level: 'Low' | 'Medium' | 'High';
  confidence: 'Low' | 'Medium' | 'High';
  tags: string[];
}

export const MOCK_POSTS: Post[] = [
  { id: 1, creator: 'Sarah Chen', creator_id: 'sarah-chen', avatar: '👩‍💼', verified: true, asset: 'NVDA', category: 'Stocks', created_at: '2h ago', content: "It's really encouraging to feel like you're a part of something great. The AI semiconductor sector continues to show massive growth potential.", likes: 234, comments: 45, shares: 12, sentiment: 'Bullish', time_horizon: 'Medium-term', risk_level: 'Medium', confidence: 'High', tags: ['#AI', '#semiconductors', '#NVDA'] },
  { id: 2, creator: 'Mike Ross', creator_id: 'mike-ross', avatar: '👨‍💻', verified: true, asset: 'TSLA', category: 'Stocks', created_at: '4h ago', content: "We stopped out the sort of company that wanted to build; one thing to watch going forward is EV adoption rates in emerging markets.", likes: 189, comments: 67, shares: 23, sentiment: 'Bearish', time_horizon: 'Short-term', risk_level: 'High', confidence: 'Medium', tags: ['#EV', '#Tesla', '#TSLA'] },
  { id: 3, creator: 'Emma Wilson', creator_id: 'emma-wilson', avatar: '👩‍🔬', verified: false, asset: 'BTC', category: 'Crypto', created_at: '5h ago', content: "As crypto standard means that anyone and everyone can invest in digital assets. Important to understand the fundamentals before jumping in.", likes: 421, comments: 89, shares: 34, sentiment: 'Neutral', time_horizon: 'Long-term', risk_level: 'High', confidence: 'Medium', tags: ['#crypto', '#bitcoin', '#BTC'] },
  { id: 4, creator: 'David Park', creator_id: 'david-park', avatar: '👨‍🎓', verified: true, asset: 'SPY', category: 'ETFs', created_at: '6h ago', content: "No one knows everything. No one knows nothing. Everyone has a piece of wisdom to share. That's what makes index investing so powerful.", likes: 567, comments: 123, shares: 45, sentiment: 'Bullish', time_horizon: 'Long-term', risk_level: 'Low', confidence: 'High', tags: ['#indexfunds', '#SPY', '#passive'] },
  { id: 5, creator: 'Lisa Zhang', creator_id: 'lisa-zhang', avatar: '👩‍💼', verified: true, asset: 'VTI', category: 'ETFs', created_at: '7h ago', content: "For long-term wealth building, low-cost index funds remain undefeated. Time in the market beats timing the market.", likes: 892, comments: 156, shares: 67, sentiment: 'Bullish', time_horizon: 'Long-term', risk_level: 'Low', confidence: 'High', tags: ['#ETF', '#VTI', '#passive'] },
  { id: 6, creator: 'James Lee', creator_id: 'james-lee', avatar: '👨‍💼', verified: true, asset: 'ETH', category: 'Crypto', created_at: '8h ago', content: "Ethereum's transition to proof-of-stake was a game changer. The energy efficiency improvements are substantial.", likes: 345, comments: 78, shares: 29, sentiment: 'Bullish', time_horizon: 'Long-term', risk_level: 'High', confidence: 'Medium', tags: ['#ETH', '#ethereum', '#crypto'] },
  { id: 7, creator: 'Anna Martinez', creator_id: 'anna-martinez', avatar: '👩‍🎓', verified: false, asset: 'IRA', category: 'Retirement', created_at: '9h ago', content: "Starting your retirement savings early compounds over time. Even small contributions make a huge difference in 30 years.", likes: 678, comments: 92, shares: 41, sentiment: 'Bullish', time_horizon: 'Long-term', risk_level: 'Low', confidence: 'High', tags: ['#retirement', '#IRA', '#savings'] },
  { id: 8, creator: 'Robert Kim', creator_id: 'robert-kim', avatar: '👨‍💻', verified: true, asset: 'GOLD', category: 'Commodities', created_at: '10h ago', content: "Gold continues to serve as a hedge against inflation. Diversification across asset classes is key to risk management.", likes: 423, comments: 67, shares: 33, sentiment: 'Bullish', time_horizon: 'Medium-term', risk_level: 'Low', confidence: 'Medium', tags: ['#gold', '#commodities', '#hedge'] },
  { id: 9, creator: 'Sophie Turner', creator_id: 'sophie-turner', avatar: '👩‍💼', verified: true, asset: 'QQQ', category: 'ETFs', created_at: '11h ago', content: "Tech-heavy ETFs have shown strong performance, but remember to balance your portfolio. Don't put all eggs in one basket.", likes: 512, comments: 89, shares: 44, sentiment: 'Neutral', time_horizon: 'Medium-term', risk_level: 'Medium', confidence: 'Medium', tags: ['#tech', '#QQQ', '#ETF'] },
  { id: 10, creator: 'Marcus Johnson', creator_id: 'marcus-johnson', avatar: '👨‍🎓', verified: false, asset: '101', category: 'Beginner Basics', created_at: '12h ago', content: "New to investing? Start with understanding the difference between stocks and bonds. Knowledge is your best investment.", likes: 789, comments: 134, shares: 78, sentiment: 'Neutral', time_horizon: 'Long-term', risk_level: 'Low', confidence: 'High', tags: ['#beginner', '#investing101', '#education'] },
];
