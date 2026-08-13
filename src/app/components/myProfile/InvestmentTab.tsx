import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, hideChartLabel } from '../../utils/chartTooltip';
import { ACTUAL_PORTFOLIO_ENABLED } from '../../featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { parseAllocation } from '../../utils/creator';
import SimulationsPanel from '../shared/SimulationsPanel';

// Same 4-color default palette CreatorProfileInvestment.tsx uses for the public view, extended
// for portfolios with more than 4 real slices.
const ALLOCATION_COLORS = ['var(--brand)', 'var(--mint)', '#f43f5e', '#e5e7eb', '#60a5fa', '#a78bfa'];

// Simulator/Actual-portfolio toggle lives here; the Simulator view itself is SimulationsPanel
// (shared with the public creator-profile view — see CreatorProfileInvestment.tsx), backed by
// the real `simulations` table instead of local mock state.
export default function InvestmentTab() {
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [simulatorMode, setSimulatorMode] = useState(true);

  // "Actual Portfolio" (real brokerage positions) is still mock/unconnected — gated off by
  // ACTUAL_PORTFOLIO_ENABLED (see featureFlags.ts), untouched by the Simulator persistence work.
  const portfolioData = useMemo(() => {
    const points = { '1W': 7, '1M': 30, '3M': 90, '1Y': 252, 'ALL': 400 }[timeRange];
    const base = { '1W': 86000, '1M': 82000, '3M': 76000, '1Y': 62000, 'ALL': 45000 }[timeRange];
    let val = base;
    return Array.from({ length: points }, (_, i) => {
      val = val + (Math.random() - 0.45) * 800 + 30;
      return { time: `t${i}`, value: Math.max(val, base * 0.85) };
    });
  }, [timeRange]);

  // Reads the real profiles.portfolio_allocation Json column via the shared parseAllocation
  // helper (same one the public Creator Profile Investment view and the About tab editor use).
  // A creator who hasn't set one gets an explicit empty state (rendered below) — never
  // synthesizes a fake default breakdown.
  const allocationData = useMemo(() => {
    const slices = parseAllocation(profile?.portfolio_allocation);
    if (slices.length === 0) return null;
    return slices.map((s, i) => ({ ...s, color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }));
  }, [profile]);

  return (
    <div className="space-y-4">

      {/* Simulator Toggle */}
      <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md border border-neutral-200">
        <div>
          <h3 className="font-medium text-sm mb-0.5">Portfolio Simulator</h3>
          <p className="text-xs text-neutral-500">Test hypothetical investment scenarios</p>
        </div>
        {ACTUAL_PORTFOLIO_ENABLED && (
          <button
            onClick={() => setSimulatorMode(!simulatorMode)}
            className={`relative w-11 h-6 rounded-full transition-colors ${simulatorMode ? 'bg-brand' : 'bg-neutral-300'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${simulatorMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        )}
      </div>

      {simulatorMode ? (
        <SimulationsPanel userId={profile?.id ?? null} editable={true} />
      ) : (
        /* ── Real Portfolio View ── */
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-sm border border-brand/20">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Actual Portfolio
            </span>
            <span className="text-xs text-neutral-400">Real positions · Updated daily</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Performance Chart</h2>
              <p className="text-base font-medium text-brand">+2.66%</p>
            </div>
            <div className="bg-neutral-50 rounded-md p-4">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height={192}>
                  <LineChart data={portfolioData} key="my-profile-line-chart">
                    <XAxis dataKey="time" hide key="my-profile-xaxis" />
                    <YAxis hide domain={['dataMin', 'dataMax']} key="my-profile-yaxis" />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                    <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="my-profile-line" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3 text-xs font-medium">
                {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)} className={`px-2.5 py-1 rounded transition-colors ${timeRange === r ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:bg-white hover:text-black'}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-3">Portfolio Allocation</h2>
            {allocationData ? (
              <div className="flex items-center gap-8">
                <div className="w-44 h-44 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} cx="50%" cy="50%" innerRadius={46} outerRadius={84} paddingAngle={2} dataKey="value" isAnimationActive={false} key="my-profile-pie">
                        {allocationData.map((entry, idx) => <Cell key={`my-profile-cell-${entry.name}-${idx}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {allocationData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-lg font-bold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
                <p className="text-sm text-neutral-500">Portfolio allocation not disclosed yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
