export type WatchlistSourceType = 'post' | 'reel' | 'model' | 'manual';

export interface WatchlistItem {
  id: number;
  user_id?: string;
  ticker: string;
  name: string;
  assetType: 'Stock' | 'ETF' | 'Crypto' | 'Sector' | 'Strategy';
  price: string;
  change1D: number;
  change1W: number;
  interestLevel: 'Low' | 'Medium' | 'High';
  status: 'Watching' | 'Building Thesis' | 'Ready to Act' | 'Reviewing';
  source: string;
  source_type: WatchlistSourceType;
  source_content_id?: number;
  lastUpdated: string;
  thesis: string;
  whyWatching: string;
  assumptions: string[];
  upsideDrivers: string[];
  downside: string[];
  timeHorizon: 'Short-term' | 'Medium-term' | 'Long-term';
  relatedPosts: number;
  relatedReels: number;
  relatedModels: number;
  decisionNotes: string;
}

export function categoryToAssetType(category: string): WatchlistItem['assetType'] {
  switch (category) {
    case 'Stocks': return 'Stock';
    case 'ETFs': return 'ETF';
    case 'Crypto': return 'Crypto';
    default: return 'Strategy';
  }
}

export const MOCK_WATCHLIST_ITEMS: WatchlistItem[] = [
  {
    id: 1, ticker: 'NVDA', name: 'Nvidia Corporation', assetType: 'Stock', price: '$892.45',
    change1D: 2.34, change1W: 5.67, interestLevel: 'High', status: 'Building Thesis',
    source: 'Saved from Reel', source_type: 'reel', source_content_id: 1,
    lastUpdated: '2 hours ago',
    thesis: 'AI chip demand continues to accelerate. NVDA has pricing power and ecosystem dominance.',
    whyWatching: 'Strong positioning in AI infrastructure buildout. Expanding data center TAM.',
    assumptions: ['AI spending continues at 40%+ growth', 'Margins remain above 60%', 'Competition stays fragmented'],
    upsideDrivers: ['New AI chip releases', 'Enterprise AI adoption', 'Gaming recovery'],
    downside: ['Hyperscaler concentration risk', 'Potential export restrictions', 'Valuation compression'],
    timeHorizon: 'Medium-term', relatedPosts: 5, relatedReels: 2, relatedModels: 1,
    decisionNotes: 'Watching for Q2 earnings. Target entry around $850.',
  },
  {
    id: 2, ticker: 'SPY', name: 'S&P 500 ETF', assetType: 'ETF', price: '$523.60',
    change1D: 0.45, change1W: 1.23, interestLevel: 'Medium', status: 'Watching',
    source: 'Saved from Model', source_type: 'model', source_content_id: 4,
    lastUpdated: '1 day ago',
    thesis: 'Broad market exposure for core holdings. Dollar cost averaging strategy.',
    whyWatching: 'Building long-term position. Waiting for pullback opportunities.',
    assumptions: ['US economy continues expansion', 'Corporate earnings growth 8-10%', 'Fed maintains current policy'],
    upsideDrivers: ['Earnings growth', 'Multiple expansion', 'Economic stability'],
    downside: ['Recession risk', 'Valuation concerns', 'Geopolitical events'],
    timeHorizon: 'Long-term', relatedPosts: 8, relatedReels: 0, relatedModels: 3,
    decisionNotes: 'Continue monthly contributions regardless of price.',
  },
  {
    id: 3, ticker: 'BTC', name: 'Bitcoin', assetType: 'Crypto', price: '$67,842',
    change1D: -1.23, change1W: 4.56, interestLevel: 'Medium', status: 'Reviewing',
    source: 'Saved from Post', source_type: 'post', source_content_id: 3,
    lastUpdated: '3 days ago',
    thesis: 'Digital store of value thesis. Institutional adoption increasing.',
    whyWatching: 'Hedge against fiat debasement. Portfolio diversification (3-5% allocation).',
    assumptions: ['Institutional adoption continues', 'Regulatory clarity improves', 'Network security remains strong'],
    upsideDrivers: ['ETF inflows', 'Halving cycle', 'Macro uncertainty'],
    downside: ['Regulatory crackdown', 'Technical vulnerabilities', 'Competitor emergence'],
    timeHorizon: 'Long-term', relatedPosts: 12, relatedReels: 3, relatedModels: 0,
    decisionNotes: 'Small position only. Never more than 5% of portfolio.',
  },
  {
    id: 4, ticker: 'AAPL', name: 'Apple Inc.', assetType: 'Stock', price: '$178.23',
    change1D: 1.12, change1W: 2.89, interestLevel: 'High', status: 'Ready to Act',
    source: 'Saved from DCF Model', source_type: 'model', source_content_id: 1,
    lastUpdated: '4 hours ago',
    thesis: 'Services revenue growth offsetting hardware cyclicality. Strong FCF generation.',
    whyWatching: 'DCF shows 15-20% upside. Quality compounder with moat.',
    assumptions: ['Services grow 15%+ annually', 'iPhone stabilizes at 50% of revenue', 'Buybacks continue'],
    upsideDrivers: ['Vision Pro ramp', 'AI features in iOS', 'India market growth'],
    downside: ['China demand weakness', 'Antitrust pressure', 'Innovation slowdown'],
    timeHorizon: 'Medium-term', relatedPosts: 3, relatedReels: 1, relatedModels: 2,
    decisionNotes: 'Plan to initiate position next week. Target 2% portfolio weight.',
  },
];
