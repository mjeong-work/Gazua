export interface Model {
  id: number;
  title: string;
  creator: string;
  creator_id: string;
  creatorAvatar: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  fileType: 'Excel' | 'Google Sheet' | 'Python' | 'Notebook' | 'PDF';
  category: 'Valuation' | 'Portfolio' | 'Quant Strategy' | 'Market Dashboard' | 'Beginner Template';
  description: string;
  learnings: string[];
  downloads: number;
  remixes: number;
  access: 'Free Preview' | 'Pro' | 'Expert Only';
}

export const MOCK_MODELS: Model[] = [
  {
    id: 1,
    title: 'Beginner DCF Model for Apple',
    creator: 'Sarah Chen', creator_id: 'sarah-chen', creatorAvatar: '👩‍💼',
    difficulty: 'Beginner', fileType: 'Excel', category: 'Valuation',
    description: 'Learn the fundamentals of discounted cash flow valuation with a pre-built Apple valuation template.',
    learnings: ['Understand DCF methodology', 'Calculate terminal value', 'Estimate discount rates'],
    downloads: 1245, remixes: 89, access: 'Free Preview',
  },
  {
    id: 2,
    title: 'RSI + MACD Trading Signal Tracker',
    creator: 'Mike Ross', creator_id: 'mike-ross', creatorAvatar: '👨‍💻',
    difficulty: 'Intermediate', fileType: 'Python', category: 'Quant Strategy',
    description: 'Technical analysis strategy combining RSI and MACD indicators for entry/exit signals.',
    learnings: ['Combine multiple indicators', 'Backtest trading strategies', 'Visualize signal strength'],
    downloads: 892, remixes: 156, access: 'Pro',
  },
  {
    id: 3,
    title: 'Portfolio Beta & Volatility Calculator',
    creator: 'Emma Wilson', creator_id: 'emma-wilson', creatorAvatar: '👩‍🔬',
    difficulty: 'Intermediate', fileType: 'Excel', category: 'Portfolio',
    description: 'Measure portfolio risk with beta, standard deviation, and correlation analysis tools.',
    learnings: ['Calculate portfolio beta', 'Measure volatility metrics', 'Analyze correlation matrices'],
    downloads: 2103, remixes: 234, access: 'Free Preview',
  },
  {
    id: 4,
    title: 'ETF Comparison Dashboard',
    creator: 'David Park', creator_id: 'david-park', creatorAvatar: '👨‍🎓',
    difficulty: 'Beginner', fileType: 'Google Sheet', category: 'Market Dashboard',
    description: 'Side-by-side comparison tool for analyzing ETF performance, fees, and holdings.',
    learnings: ['Compare expense ratios', 'Analyze sector allocations', 'Track performance metrics'],
    downloads: 3421, remixes: 512, access: 'Free Preview',
  },
  {
    id: 5,
    title: 'Sector Rotation Quant Template',
    creator: 'Alex Rodriguez', creator_id: 'alex-rodriguez', creatorAvatar: '👨‍💼',
    difficulty: 'Advanced', fileType: 'Python', category: 'Quant Strategy',
    description: 'Momentum-based sector rotation strategy using relative strength and macroeconomic signals.',
    learnings: ['Build rotation models', 'Use macro indicators', 'Optimize rebalancing frequency'],
    downloads: 567, remixes: 78, access: 'Pro',
  },
  {
    id: 6,
    title: 'Macro Sentiment Score Model',
    creator: 'Lisa Zhang', creator_id: 'lisa-zhang', creatorAvatar: '👩‍💼',
    difficulty: 'Expert', fileType: 'Notebook', category: 'Quant Strategy',
    description: 'Advanced NLP sentiment analysis combining Fed statements, earnings calls, and news data.',
    learnings: ['Process text data at scale', 'Build sentiment indicators', 'Integrate with trading signals'],
    downloads: 234, remixes: 45, access: 'Expert Only',
  },
  {
    id: 7,
    title: 'Dividend Yield Tracker',
    creator: 'James Lee', creator_id: 'james-lee', creatorAvatar: '👨‍💼',
    difficulty: 'Beginner', fileType: 'Excel', category: 'Beginner Template',
    description: 'Track dividend payments, yield on cost, and payout ratios for your income portfolio.',
    learnings: ['Calculate dividend yield', 'Track payment history', 'Monitor payout sustainability'],
    downloads: 1876, remixes: 301, access: 'Free Preview',
  },
  {
    id: 8,
    title: 'Monte Carlo Portfolio Simulator',
    creator: 'Anna Martinez', creator_id: 'anna-martinez', creatorAvatar: '👩‍🎓',
    difficulty: 'Advanced', fileType: 'Python', category: 'Portfolio',
    description: 'Run thousands of portfolio simulations to estimate probable outcomes and risk metrics.',
    learnings: ['Understand Monte Carlo methods', 'Model portfolio uncertainty', 'Visualize probability distributions'],
    downloads: 678, remixes: 92, access: 'Pro',
  },
  {
    id: 9,
    title: 'P/E Ratio Comparison Tool',
    creator: 'Robert Kim', creator_id: 'robert-kim', creatorAvatar: '👨‍💻',
    difficulty: 'Beginner', fileType: 'Google Sheet', category: 'Valuation',
    description: 'Compare price-to-earnings ratios across stocks, sectors, and historical averages.',
    learnings: ['Interpret P/E ratios', 'Compare against peers', 'Identify value opportunities'],
    downloads: 2987, remixes: 445, access: 'Free Preview',
  },
  {
    id: 10,
    title: 'Options Greeks Calculator',
    creator: 'Sophie Turner', creator_id: 'sophie-turner', creatorAvatar: '👩‍💼',
    difficulty: 'Expert', fileType: 'Excel', category: 'Quant Strategy',
    description: 'Calculate delta, gamma, theta, vega, and rho for options strategies and risk management.',
    learnings: ['Master options Greeks', 'Build hedging strategies', 'Analyze option sensitivities'],
    downloads: 412, remixes: 67, access: 'Expert Only',
  },
  {
    id: 11,
    title: 'Mean Reversion Trading Signals',
    creator: 'Alex Rodriguez', creator_id: 'alex-rodriguez', creatorAvatar: '👨‍💼',
    difficulty: 'Intermediate', fileType: 'Excel', category: 'Quant Strategy',
    description: 'Statistical arbitrage model identifying mean reversion opportunities in equity pairs.',
    learnings: ['Understand mean reversion', 'Identify pairs for arbitrage', 'Backtest signal quality'],
    downloads: 1234, remixes: 156, access: 'Free Preview',
  },
  {
    id: 12,
    title: 'Portfolio Risk Attribution Model',
    creator: 'Alex Rodriguez', creator_id: 'alex-rodriguez', creatorAvatar: '👨‍💼',
    difficulty: 'Advanced', fileType: 'Python', category: 'Portfolio',
    description: 'Decompose portfolio returns into factor exposures and measure risk contribution by position.',
    learnings: ['Factor decomposition', 'Risk attribution analysis', 'Build reporting dashboards'],
    downloads: 892, remixes: 103, access: 'Pro',
  },
];

export function getModelsByCreator(creatorId: string): Model[] {
  return MOCK_MODELS.filter(m => m.creator_id === creatorId);
}
