import type { CredibilityLevel } from '../../types/database';

// Re-exported so existing `import { type CreatorTier }` call sites keep working — this is now
// just an alias for the real credibility_level enum (see Issue 5), not a separate mock-only tier.
export type CreatorTier = CredibilityLevel;

export const CREDIBILITY_LEVEL_LABELS: Record<CredibilityLevel, string> = {
  explorer: 'Explorer',
  contributor: 'Contributor',
  analyst: 'Analyst',
  educator: 'Educator',
  verified_pro: 'Verified Pro',
};

export interface MockCreator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  verified: boolean;
  followers: string;
  following: string;
  posts: string;
  focus: string;
  credibilityLevel: CredibilityLevel;
}

export const MOCK_CREATORS: Record<string, MockCreator> = {
  'alex-rodriguez': {
    id: 'alex-rodriguez',
    name: 'Alex Rodriguez',
    handle: '@alexrodriguez',
    avatar: '👨‍💼',
    bio: 'Investment educator helping everyday people build wealth through smart investing. 15+ years experience in portfolio management. Sharing real strategies, not get-rich-quick schemes. Not financial advice — always do your own research.',
    verified: true,
    followers: '127K',
    following: '342',
    posts: '1.2K',
    focus: 'Value Investing',
    credibilityLevel: 'educator',
  },
  'sarah-chen': {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    handle: '@sarahchen',
    avatar: '👩‍💼',
    bio: 'Tech stock analyst and growth investor. Sharing deep dives on high-growth companies and emerging market trends. CFA charterholder.',
    verified: true,
    followers: '89K',
    following: '218',
    posts: '847',
    focus: 'Growth Stocks',
    credibilityLevel: 'analyst',
  },
  'mike-ross': {
    id: 'mike-ross',
    name: 'Mike Ross',
    handle: '@mikeross',
    avatar: '👨‍💻',
    bio: 'Quant strategist and algorithmic trading specialist. Python, backtesting, and systematic market approaches. Former hedge fund analyst.',
    verified: true,
    followers: '56K',
    following: '134',
    posts: '423',
    focus: 'Quant & Models',
    credibilityLevel: 'analyst',
  },
  'emma-wilson': {
    id: 'emma-wilson',
    name: 'Emma Wilson',
    handle: '@emmawilson',
    avatar: '👩‍🔬',
    bio: 'Crypto fundamentals researcher and blockchain technology analyst. Education-first approach to digital assets.',
    verified: false,
    followers: '94K',
    following: '301',
    posts: '612',
    focus: 'Crypto',
    credibilityLevel: 'explorer',
  },
  'david-park': {
    id: 'david-park',
    name: 'David Park',
    handle: '@davidpark',
    avatar: '👨‍🎓',
    bio: 'Passive investing advocate. Index funds, low costs, and long-term compounding. Making investing deliberately boring.',
    verified: true,
    followers: '112K',
    following: '89',
    posts: '934',
    focus: 'Index Funds',
    credibilityLevel: 'educator',
  },
  'lisa-zhang': {
    id: 'lisa-zhang',
    name: 'Lisa Zhang',
    handle: '@lisazhang',
    avatar: '👩‍💼',
    bio: 'Options strategist and risk management educator. Teaching Greeks, spreads, and structured positions to serious traders.',
    verified: true,
    followers: '67K',
    following: '178',
    posts: '712',
    focus: 'Options Trading',
    credibilityLevel: 'analyst',
  },
  'james-lee': {
    id: 'james-lee',
    name: 'James Lee',
    handle: '@jameslee',
    avatar: '👨‍💼',
    bio: 'Making investing simple for everyone. Plain-English guides from saving your first dollar to building a diversified portfolio.',
    verified: true,
    followers: '143K',
    following: '204',
    posts: '1.1K',
    focus: 'Beginner Education',
    credibilityLevel: 'educator',
  },
};

export function getCreator(id: string): MockCreator | null {
  return MOCK_CREATORS[id] ?? null;
}

export function nameToCreatorId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export interface CreatorCard {
  /** number for the mock catalog below; a real profile UUID string for DB-backed creators. */
  id: number | string;
  name: string;
  avatar: string;
  tagline: string;
  focus: string;
  followers: string;
  tags: string[];
  verified: boolean;
}

export const FEATURED_CREATORS: CreatorCard[] = [
  { id: 1, name: 'Alex Rodriguez', avatar: '👨‍💼', tagline: 'Helping everyday investors build wealth', focus: 'Value Investing', followers: '127K', tags: ['Stocks', 'ETFs', 'Beginner'], verified: true },
  { id: 2, name: 'Sarah Chen', avatar: '👩‍💼', tagline: 'Tech stock analysis and growth investing', focus: 'Growth Stocks', followers: '89K', tags: ['Stocks', 'Tech', 'Analysis'], verified: true },
  { id: 3, name: 'Mike Ross', avatar: '👨‍💻', tagline: 'Quant strategies and algorithmic trading', focus: 'Quant & Models', followers: '56K', tags: ['Python', 'Quant', 'Models'], verified: true },
];

export const TRENDING_CREATORS: CreatorCard[] = [
  { id: 4, name: 'Emma Wilson', avatar: '👩‍🔬', tagline: 'Crypto fundamentals and blockchain tech', focus: 'Crypto', followers: '94K', tags: ['Crypto', 'Bitcoin', 'Blockchain'], verified: false },
  { id: 5, name: 'David Park', avatar: '👨‍🎓', tagline: 'Passive index investing for beginners', focus: 'Index Funds', followers: '112K', tags: ['Beginner', 'ETFs', 'Passive'], verified: true },
  { id: 6, name: 'Lisa Zhang', avatar: '👩‍💼', tagline: 'Options strategies and risk management', focus: 'Options Trading', followers: '67K', tags: ['Options', 'Strategy', 'Risk'], verified: true },
];

export const BEGINNER_EDUCATORS: CreatorCard[] = [
  { id: 7, name: 'James Lee', avatar: '👨‍💼', tagline: 'Making investing simple for everyone', focus: 'Beginner Education', followers: '143K', tags: ['Beginner', 'Basics', 'Education'], verified: true },
  { id: 8, name: 'Anna Martinez', avatar: '👩‍🎓', tagline: 'First-time investor guides', focus: 'Beginner Basics', followers: '78K', tags: ['Beginner', 'Guides', 'Tips'], verified: false },
  { id: 9, name: 'Robert Kim', avatar: '👨‍💻', tagline: 'Finance explained with simple examples', focus: 'Education', followers: '91K', tags: ['Beginner', 'Finance', 'Simple'], verified: true },
];

export const QUANT_BUILDERS: CreatorCard[] = [
  { id: 10, name: 'Sophie Turner', avatar: '👩‍💼', tagline: 'Python quant models and backtesting', focus: 'Quant Development', followers: '45K', tags: ['Python', 'Quant', 'Backtesting'], verified: true },
  { id: 11, name: 'Marcus Johnson', avatar: '👨‍🎓', tagline: 'Statistical arbitrage and market microstructure', focus: 'Advanced Quant', followers: '38K', tags: ['Stats', 'Arbitrage', 'Advanced'], verified: false },
];

export const STOCK_PICKERS: CreatorCard[] = [
  { id: 12, name: 'Rachel Green', avatar: '👩‍💼', tagline: 'Deep value stock research', focus: 'Value Stocks', followers: '82K', tags: ['Value', 'Research', 'Analysis'], verified: true },
  { id: 13, name: 'Tom Anderson', avatar: '👨‍💼', tagline: 'Growth stock opportunities', focus: 'Growth Stocks', followers: '96K', tags: ['Growth', 'Stocks', 'Tech'], verified: true },
];

export const CRYPTO_VOICES: CreatorCard[] = [
  { id: 14, name: 'Crypto Katie', avatar: '👩‍💻', tagline: 'DeFi protocols and yield farming', focus: 'DeFi', followers: '103K', tags: ['DeFi', 'Crypto', 'Yield'], verified: false },
  { id: 15, name: 'Bitcoin Brian', avatar: '👨‍💻', tagline: 'Bitcoin fundamentals and macro', focus: 'Bitcoin', followers: '127K', tags: ['Bitcoin', 'Macro', 'Crypto'], verified: true },
];

export const RETIREMENT_EXPERTS: CreatorCard[] = [
  { id: 16, name: 'Retirement Rachel', avatar: '👩‍🏫', tagline: 'IRA and 401k optimization', focus: 'Retirement Planning', followers: '115K', tags: ['Retirement', 'IRA', '401k'], verified: true },
  { id: 17, name: 'Dividend Dan', avatar: '👨‍🏫', tagline: 'Dividend growth investing for income', focus: 'Dividend Income', followers: '88K', tags: ['Dividends', 'Income', 'Retirement'], verified: true },
];
