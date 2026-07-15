// ── Types ─────────────────────────────────────────────────────────────

export type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

export interface SimulationHolding {
  symbol: string;
  name?: string;
  allocationAmount: number;
  allocationPercent: number;
  expectedReturnPercent: number;
}

export interface SimulationChartPoint {
  date: string;
  hypothesisValue: number;
  actualValue: number;
}

export interface Simulation {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  capital: number;
  holdings: SimulationHolding[];
  cashAmount: number;
  hypothesisReturnPercent: number;
  actualReturnPercent: number;
  hypothesisValue: number;
  actualValue: number;
  differencePercent: number;
  differenceValue: number;
  chartData: SimulationChartPoint[];
  insights: string[];
}

export interface ActualInvestment {
  connected: boolean;
  brokerName?: string;
  accountValue?: number;
  totalReturnPercent?: number;
  totalReturnValue?: number;
  lastSyncedAt?: string;
}

// ── Chart data generation ──────────────────────────────────────────────

function generateChartData(
  startDate: string,
  totalDays: number,
  capital: number,
  hypothesisReturn: number,
  actualReturn: number,
  seed: number,
): SimulationChartPoint[] {
  const data: SimulationChartPoint[] = [];
  const startMs = new Date(startDate).getTime();
  const DAY_MS = 86_400_000;

  for (let i = 0; i <= totalDays; i++) {
    const t = i / totalDays;
    const date = new Date(startMs + i * DAY_MS).toISOString().split('T')[0];

    const hypothesisValue = Math.round(capital * (1 + (hypothesisReturn / 100) * t));

    // Noise peaks in the middle, zero at endpoints — ensures start/end match exactly
    const noiseScale = Math.sin(Math.PI * t) * 0.035;
    const noise =
      noiseScale *
      (Math.sin(i * 0.31 + seed) + Math.cos(i * 0.17 + seed * 2) * 0.6);
    const actualValue = Math.round(
      capital * (1 + (actualReturn / 100) * t + noise),
    );

    data.push({ date, hypothesisValue, actualValue });
  }

  return data;
}

// ── Mock simulations ───────────────────────────────────────────────────

export const MOCK_SIMULATIONS: Simulation[] = [
  {
    id: 'sim-1',
    title: 'NVDA & TSLA Portfolio',
    startDate: '2026-01-01',
    endDate: '2026-06-01',
    capital: 50_000,
    holdings: [
      { symbol: 'NVDA', name: 'Nvidia Corporation', allocationAmount: 30_000, allocationPercent: 60, expectedReturnPercent: 25 },
      { symbol: 'TSLA', name: 'Tesla Inc.', allocationAmount: 15_000, allocationPercent: 30, expectedReturnPercent: 10 },
    ],
    cashAmount: 5_000,
    hypothesisReturnPercent: 15.0,
    actualReturnPercent: 8.5,
    hypothesisValue: 57_500,
    actualValue: 54_250,
    differencePercent: -6.5,
    differenceValue: -3_250,
    chartData: generateChartData('2026-01-01', 151, 50_000, 15.0, 8.5, 1),
    insights: [
      'Your hypothesis was optimistic by 6.5%.',
      'NVDA performed better than expected (+28% vs. predicted +25%).',
      'TSLA underperformed versus your model (+2% vs. predicted +10%).',
      'Your portfolio generated a positive return despite missing the target.',
    ],
  },
  {
    id: 'sim-2',
    title: 'Tech Growth Portfolio',
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    capital: 75_000,
    holdings: [
      { symbol: 'AAPL', name: 'Apple Inc.', allocationAmount: 25_000, allocationPercent: 33, expectedReturnPercent: 18 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', allocationAmount: 25_000, allocationPercent: 33, expectedReturnPercent: 20 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', allocationAmount: 25_000, allocationPercent: 34, expectedReturnPercent: 28 },
    ],
    cashAmount: 0,
    hypothesisReturnPercent: 22.0,
    actualReturnPercent: 18.5,
    hypothesisValue: 91_500,
    actualValue: 88_875,
    differencePercent: -3.5,
    differenceValue: -2_625,
    chartData: generateChartData('2025-10-01', 181, 75_000, 22.0, 18.5, 2),
    insights: [
      'Strong execution — hypothesis was off by only 3.5%.',
      'GOOGL outperformed expectations significantly.',
      'AAPL lagged slightly behind your model.',
      'A very solid call on Big Tech momentum.',
    ],
  },
  {
    id: 'sim-3',
    title: 'Conservative Value Play',
    startDate: '2025-07-01',
    endDate: '2026-01-01',
    capital: 100_000,
    holdings: [
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', allocationAmount: 30_000, allocationPercent: 30, expectedReturnPercent: 8 },
      { symbol: 'JNJ', name: 'Johnson & Johnson', allocationAmount: 25_000, allocationPercent: 25, expectedReturnPercent: 6 },
      { symbol: 'PG', name: 'Procter & Gamble', allocationAmount: 25_000, allocationPercent: 25, expectedReturnPercent: 7 },
      { symbol: 'KO', name: 'Coca-Cola Co.', allocationAmount: 20_000, allocationPercent: 20, expectedReturnPercent: 10 },
    ],
    cashAmount: 0,
    hypothesisReturnPercent: 8.0,
    actualReturnPercent: 11.2,
    hypothesisValue: 108_000,
    actualValue: 111_200,
    differencePercent: 3.2,
    differenceValue: 3_200,
    chartData: generateChartData('2025-07-01', 184, 100_000, 8.0, 11.2, 3),
    insights: [
      'Excellent — actual performance beat your hypothesis by 3.2%.',
      'KO delivered stronger dividends than modeled.',
      'BRK.B had a standout quarter, boosting returns.',
      'Conservative portfolios can surprise to the upside.',
    ],
  },
  {
    id: 'sim-4',
    title: 'Crypto Diversification Test',
    startDate: '2025-09-01',
    endDate: '2026-02-28',
    capital: 25_000,
    holdings: [
      { symbol: 'BTC', name: 'Bitcoin', allocationAmount: 10_000, allocationPercent: 40, expectedReturnPercent: 40 },
      { symbol: 'ETH', name: 'Ethereum', allocationAmount: 7_500, allocationPercent: 30, expectedReturnPercent: 35 },
      { symbol: 'SOL', name: 'Solana', allocationAmount: 5_000, allocationPercent: 20, expectedReturnPercent: 30 },
      { symbol: 'AVAX', name: 'Avalanche', allocationAmount: 1_875, allocationPercent: 7.5, expectedReturnPercent: 40 },
      { symbol: 'DOT', name: 'Polkadot', allocationAmount: 625, allocationPercent: 2.5, expectedReturnPercent: 25 },
    ],
    cashAmount: 0,
    hypothesisReturnPercent: 35.0,
    actualReturnPercent: -5.2,
    hypothesisValue: 33_750,
    actualValue: 23_700,
    differencePercent: -40.2,
    differenceValue: -10_050,
    chartData: generateChartData('2025-09-01', 180, 25_000, 35.0, -5.2, 4),
    insights: [
      'Actual performance missed hypothesis by 40.2% — a significant miss.',
      'Crypto markets experienced high volatility in this period.',
      'BTC held better than altcoins, minimizing overall losses.',
      'Diversification helped but did not protect against the market-wide downturn.',
    ],
  },
];

// ── Mock actual investment ─────────────────────────────────────────────

export const MOCK_ACTUAL_INVESTMENT_DISCONNECTED: ActualInvestment = {
  connected: false,
};

export const MOCK_ACTUAL_INVESTMENT_CONNECTED: ActualInvestment = {
  connected: true,
  brokerName: 'Fidelity',
  accountValue: 142_500,
  totalReturnPercent: 14.0,
  totalReturnValue: 17_500,
  lastSyncedAt: '2026-06-21T08:30:00Z',
};

// ── Helpers ────────────────────────────────────────────────────────────

export const RANGE_DAYS: Record<TimeRange, number | null> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  'ALL': null,
};

export function filterChartData(
  data: SimulationChartPoint[],
  timeRange: TimeRange,
): SimulationChartPoint[] {
  const count = RANGE_DAYS[timeRange];
  if (count === null) return data;
  return data.slice(Math.max(0, data.length - count));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
