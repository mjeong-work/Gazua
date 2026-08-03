import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { SimulationChartPoint, TimeRange } from '../data/simulations';
import { formatCurrency } from '../data/simulations';

const TIME_RANGES: TimeRange[] = ['1W', '1M', '3M', '1Y', 'ALL'];

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function tickFormatter(dateStr: string) {
  return parseDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function yTickFormatter(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const dateStr = typeof label === 'string'
    ? parseDate(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : label;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-2">{dateStr}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>
            {p.dataKey === 'hypothesisValue' ? 'Hypothesis' : 'Actual'}
          </span>
          <span className="font-medium text-gray-800">
            {formatCurrency(p.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  chartData: SimulationChartPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
}

export default function PerformanceTrendChart({ chartData, timeRange, onTimeRangeChange }: Props) {
  // Thin out ticks so X-axis is readable
  const tickCount = Math.min(chartData.length, 6);
  const interval = Math.max(1, Math.floor((chartData.length - 1) / (tickCount - 1)));

  return (
    <div className="border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900">Performance Trend</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                timeRange === r
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              interval={interval}
              tick={{ fontSize: 10, fill: 'var(--icon-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fontSize: 10, fill: 'var(--icon-muted)' }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="hypothesisValue"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actualValue"
              stroke="var(--brand)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <svg width="24" height="8">
            <line
              x1="0" y1="4" x2="24" y2="4"
              stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 3"
            />
          </svg>
          Hypothesis
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--brand)" strokeWidth="2" />
          </svg>
          Actual
        </div>
      </div>
    </div>
  );
}
