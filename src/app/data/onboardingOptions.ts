export type Level = 'beginner' | 'experienced' | 'confident';

export interface OnboardingLevel {
  id: Level;
  emoji: string;
  title: string;
  description: string;
}

export const ONBOARDING_LEVELS: OnboardingLevel[] = [
  { id: 'beginner', emoji: '🌱', title: 'Complete Beginner', description: "I'm just starting out" },
  { id: 'experienced', emoji: '📈', title: 'Some Experience', description: "I've invested before" },
  { id: 'confident', emoji: '🧠', title: 'Confident Investor', description: "I know what I'm doing" },
];

export const INTEREST_OPTIONS: string[] = [
  'Stocks',
  'ETFs',
  'Crypto',
  'Retirement',
  'Commodities',
  'Macro',
  'Beginner Basics',
  'Options',
  'Real Estate',
];

export type RiskStyle = 'conservative' | 'balanced' | 'aggressive' | 'speculative';

export interface RiskOption {
  id: RiskStyle;
  emoji: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  selectedBg: string;
}

export const RISK_STYLES: RiskOption[] = [
  { id: 'conservative', emoji: '🔵', title: 'Conservative', description: 'Safety first, slow and steady', color: 'border-blue-500', bgColor: 'bg-blue-500/5', selectedBg: 'bg-blue-500/10' },
  { id: 'balanced', emoji: '🟢', title: 'Balanced', description: 'Mix of growth and stability', color: 'border-green-500', bgColor: 'bg-green-500/5', selectedBg: 'bg-green-500/10' },
  { id: 'aggressive', emoji: '🟡', title: 'Aggressive', description: 'High growth, comfortable with volatility', color: 'border-yellow-500', bgColor: 'bg-yellow-500/5', selectedBg: 'bg-yellow-500/10' },
  { id: 'speculative', emoji: '🔴', title: 'Speculative', description: 'High risk, high reward mindset', color: 'border-red-500', bgColor: 'bg-red-500/5', selectedBg: 'bg-red-500/10' },
];
