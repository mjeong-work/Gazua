export interface MarketIndex {
  id: string;
  name: string;
  value: string;
  change: string;
  changePercent: number;
  positive: boolean;
}

export const MARKET_INDICES: MarketIndex[] = [
  { id: 'sp500', name: 'S&P 500', value: '5,234.18', change: '+0.82%', changePercent: 0.82, positive: true },
  { id: 'qqq', name: 'Nasdaq', value: '$452.18', change: '+0.91%', changePercent: 0.91, positive: true },
  { id: 'btc', name: 'Bitcoin', value: '$67,842', change: '+2.14%', changePercent: 2.14, positive: true },
  { id: 'gold', name: 'Gold', value: '$2,387', change: '-0.34%', changePercent: -0.34, positive: false },
];

export interface TickerInfo {
  price: string;
  changeAmt: string;
  change: string;
  positive: boolean;
  chartData: { time: string; value: number }[];
}

export const TICKER_CHART_DATA: Record<string, TickerInfo> = {
  NVDA: {
    price: '$875.40',
    changeAmt: '+$24.18',
    change: '+2.84%',
    positive: true,
    chartData: [820,825,830,822,835,840,838,845,852,848,855,862,858,865,870,868,872,878,875,880,876,882,879,885,888,884,887,872,869,875].map((v, i) => ({ time: `t${i}`, value: v })),
  },
  TSLA: {
    price: '$184.22',
    changeAmt: '-$2.30',
    change: '-1.23%',
    positive: false,
    chartData: [195,192,190,194,196,193,191,188,186,189,187,185,183,186,188,185,183,181,179,182,180,183,185,182,180,178,181,184,183,184].map((v, i) => ({ time: `t${i}`, value: v })),
  },
  SPY: {
    price: '$523.88',
    changeAmt: '+$3.28',
    change: '+0.63%',
    positive: true,
    chartData: [502,504,506,503,508,510,507,512,515,513,516,514,518,520,517,519,522,520,518,521,523,521,524,522,520,523,521,524,522,524].map((v, i) => ({ time: `t${i}`, value: v })),
  },
  BTC: {
    price: '$67,842',
    changeAmt: '+$1,423',
    change: '+2.14%',
    positive: true,
    chartData: [60000,61200,62500,61800,63000,64200,63500,65000,66200,65800,66500,67000,66200,67500,68000,67200,67800,68500,67900,68200,68800,67600,68100,67400,68000,67800,68300,67900,68100,67842].map((v, i) => ({ time: `t${i}`, value: v })),
  },
  ETH: {
    price: '$3,412.55',
    changeAmt: '+$57.84',
    change: '+1.72%',
    positive: true,
    chartData: [3100,3150,3200,3180,3220,3250,3230,3270,3300,3280,3310,3330,3310,3350,3370,3350,3380,3400,3380,3410,3430,3410,3440,3420,3450,3430,3440,3420,3410,3413].map((v, i) => ({ time: `t${i}`, value: v })),
  },
  QQQ: {
    price: '$452.18',
    changeAmt: '+$4.09',
    change: '+0.91%',
    positive: true,
    chartData: [432,434,436,433,437,439,437,441,443,441,444,442,445,447,445,447,449,447,449,451,449,451,453,451,449,452,450,452,451,452].map((v, i) => ({ time: `t${i}`, value: v })),
  },
};
