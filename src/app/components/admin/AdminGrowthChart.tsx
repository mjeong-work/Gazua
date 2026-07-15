import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_TOOLTIP_STYLE, showChartLabel } from '../../utils/chartTooltip';
import type { GrowthBucket, GrowthPoint } from '../../../types/admin';

interface AdminGrowthChartProps {
  data: GrowthPoint[];
  bucket: GrowthBucket;
  onBucketChange: (bucket: GrowthBucket) => void;
}

// Structural template borrowed from PerformanceTrendChart.tsx / MyProfilePage.tsx's analytics
// tab: ResponsiveContainer + LineChart, #00a86b primary series, light CartesianGrid, compact
// tooltip via chartTooltip.ts. Not a literal import of PerformanceTrendChart (that component is
// tightly coupled to currency-formatted simulation data) — just the same established styling.
export default function AdminGrowthChart({ data, bucket, onBucketChange }: AdminGrowthChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">User Growth</h2>
        <div className="flex items-center gap-1 text-xs font-medium">
          {(['day', 'week', 'month'] as const).map(b => (
            <button
              key={b}
              onClick={() => onBucketChange(b)}
              className={`px-2.5 py-1 rounded-full capitalize transition-colors ${
                bucket === b ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-16">No signups in this range yet.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={showChartLabel} />
              <Line type="monotone" dataKey="newUsers" name="New users" stroke="#00a86b" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="newCreators" name="New creators" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#00a86b]" /><span className="text-xs font-medium text-gray-600">New users</span></div>
            <div className="flex items-center gap-1.5"><div style={{ borderTop: '2px dashed #7c3aed', height: 0 }} className="w-3" /><span className="text-xs font-medium text-gray-600">New creators</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
