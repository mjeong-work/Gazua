export interface Reel {
  id: number;
  /** Supabase UUID of the reel itself — present for DB-backed reels, undefined for mock. */
  db_id?: string;
  creator: string;
  creator_id: string;    // username slug — used for navigation
  creator_db_id?: string; // Supabase UUID — used for follow operations
  handle: string;
  avatar: string;
  verified: boolean;
  caption: string;
  thumbnail: string;
  /** Bucket-relative path to the uploaded video — present for DB-backed reels with real video. */
  storage_path?: string;
  likes: number;
  comments: number;
  shares: number;
  created_at?: string;
  tickers: string[];
}

export const MOCK_REELS: Reel[] = [
  {
    id: 1,
    creator: 'Alex Martinez',
    creator_id: 'alex-rodriguez',
    handle: '@alexinvests',
    avatar: '👨‍💼',
    verified: true,
    caption: "Why I'm ALL IN on AI stocks right now 🚀 #NVDA #investing",
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    likes: 24500,
    comments: 892,
    shares: 234,
    tickers: ['NVDA'],
  },
  {
    id: 2,
    creator: 'Sarah Chen',
    creator_id: 'sarah-chen',
    handle: '@sarahchen',
    avatar: '👩‍💼',
    verified: true,
    caption: "Why I'm overweight $NVDA in my tech portfolio right now 🤔 #NVDA #growth",
    thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    likes: 18200,
    comments: 743,
    shares: 198,
    tickers: ['NVDA'],
  },
  {
    id: 3,
    creator: 'Mike Ross',
    creator_id: 'mike-ross',
    handle: '@mikeross',
    avatar: '👨‍💻',
    verified: true,
    caption: "Built a backtested mean-reversion strategy in Python — here's what works #SPY #quant",
    thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    likes: 31500,
    comments: 1204,
    shares: 567,
    tickers: ['SPY'],
  },
  {
    id: 4,
    creator: 'David Park',
    creator_id: 'david-park',
    handle: '@davidpark',
    avatar: '👨‍🎓',
    verified: true,
    caption: "The case for doing nothing with your $SPY position in a volatile market #SPY #passive",
    thumbnail: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    likes: 22800,
    comments: 891,
    shares: 312,
    tickers: ['SPY'],
  },
  {
    id: 5,
    creator: 'Emma Wilson',
    creator_id: 'emma-wilson',
    handle: '@emmawilson',
    avatar: '👩‍🔬',
    verified: false,
    caption: "Understanding Bitcoin's correlation with traditional assets in 2026 #BTC #crypto",
    thumbnail: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    likes: 15600,
    comments: 628,
    shares: 145,
    tickers: ['BTC'],
  },
];

export interface Video {
  id: number;
  creator_id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploaded_at: string;
}

export const CREATOR_VIDEOS: Video[] = [
  { id: 1, creator_id: 'alex-rodriguez', title: "5 Stocks I'm Buying in 2026", thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', duration: '12:34', views: '234K', uploaded_at: '2 days ago' },
  { id: 2, creator_id: 'sarah-chen',     title: 'Deep Dive: NVIDIA Growth Story', thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', duration: '8:45', views: '189K', uploaded_at: '5 days ago' },
  { id: 3, creator_id: 'alex-rodriguez', title: 'Portfolio Update: March 2026', thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', duration: '15:22', views: '421K', uploaded_at: '1 week ago' },
  { id: 4, creator_id: 'mike-ross',      title: 'Building a Quant Strategy in Python', thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', duration: '10:18', views: '567K', uploaded_at: '2 weeks ago' },
  { id: 5, creator_id: 'sarah-chen',     title: 'Top 5 Tech Stocks for 2026', thumbnail: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', duration: '14:56', views: '312K', uploaded_at: '3 weeks ago' },
  { id: 6, creator_id: 'alex-rodriguez', title: 'ETFs vs Individual Stocks', thumbnail: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', duration: '11:03', views: '298K', uploaded_at: '1 month ago' },
  { id: 7, creator_id: 'mike-ross',      title: 'RSI & MACD: How I Use Them Together', thumbnail: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', duration: '9:27', views: '612K', uploaded_at: '1 month ago' },
  { id: 8, creator_id: 'alex-rodriguez', title: 'How I Built a $100K Portfolio', thumbnail: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', duration: '16:45', views: '892K', uploaded_at: '2 months ago' },
  { id: 9, creator_id: 'sarah-chen',     title: 'Growth vs Value: Which Wins in 2026?', thumbnail: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', duration: '13:12', views: '445K', uploaded_at: '2 months ago' },
];

export function getVideosByCreator(creatorId: string): Video[] {
  return CREATOR_VIDEOS.filter(v => v.creator_id === creatorId);
}
