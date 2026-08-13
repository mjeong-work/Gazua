import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import AppHeader from './AppHeader';
import CreatorProfileHeader from './creatorProfile/CreatorProfileHeader';
import CreatorProfileTabs, { type CreatorProfileTab } from './creatorProfile/CreatorProfileTabs';
import CreatorPostsTab from './creatorProfile/CreatorPostsTab';
import CreatorAboutTab from './creatorProfile/CreatorAboutTab';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, hideChartLabel } from '../utils/chartTooltip';
import { useCreatorProfileData } from '../hooks/useCreatorProfileData';
import { parseAllocation } from '../utils/creator';
import { ACTUAL_PORTFOLIO_ENABLED } from '../featureFlags';
import type { Simulation } from '../data/simulations';
import { MOCK_SIMULATIONS, filterChartData } from '../data/simulations';
import SimulationSetupCard from './SimulationSetupCard';
import PerformanceSummaryCards from './PerformanceSummaryCards';
import PerformanceTrendChart from './PerformanceTrendChart';
import PastSimulationsList from './PastSimulationsList';
import SimulationInsights from './SimulationInsights';

// Same 4-color default palette the hardcoded allocation used, extended for portfolios with
// more than 4 real slices.
const ALLOCATION_COLORS = ['var(--brand)', 'var(--mint)', '#f43f5e', '#e5e7eb', '#60a5fa', '#a78bfa'];

// ── Component ─────────────────────────────────────────────────────────
export default function CreatorProfileInvestment() {
  const navigate = useNavigate();
  const { creatorId = 'alex-rodriguez' } = useParams<{ creatorId: string }>();

  const { dbProfile, profileLoading, followerCount, followingCount, postCount, posts, creator } =
    useCreatorProfileData(creatorId);

  // ── UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CreatorProfileTab>('investment');
  const handleSelectTab = (tab: CreatorProfileTab) => {
    setActiveTab(tab);
    if (tab === 'videos') navigate(`/profile/${creatorId}/videos`);
  };

  // ── Investment tab ─────────────────────────────────────────────────
  const [simulatorMode, setSimulatorMode] = useState(true);
  const [simulationExpanded, setSimulationExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation>(MOCK_SIMULATIONS[0]);

  const portfolioData = useMemo(() => {
    const points = { '1W': 7, '1M': 30, '3M': 90, '1Y': 252, 'ALL': 400 }[timeRange];
    const base = { '1W': 86000, '1M': 82000, '3M': 76000, '1Y': 62000, 'ALL': 45000 }[timeRange];
    let val = base;
    return Array.from({ length: points }, (_, i) => {
      val = val + (Math.random() - 0.45) * 800 + 30;
      return { time: `t${i}`, value: Math.max(val, base * 0.85) };
    });
  }, [timeRange]);

  const simulationChartData = useMemo(
    () => filterChartData(selectedSimulation.chartData, timeRange),
    [selectedSimulation, timeRange],
  );

  const handleSelectSimulation = (simulation: Simulation) => {
    setSelectedSimulation(simulation);
    setSimulationExpanded(false);
  };

  // Reads the real profiles.portfolio_allocation Json column via the shared parseAllocation
  // helper (also used by My Profile's About/Investment tabs), colors assigned by the frontend.
  // A creator who hasn't set one gets an explicit empty state (rendered below) — this must
  // never synthesize a fake default breakdown, since that would be indistinguishable from a
  // real, intentionally-set allocation (audit finding).
  const allocationData = useMemo(() => {
    const slices = parseAllocation(dbProfile?.portfolio_allocation);
    if (slices.length === 0) return null;
    return slices.map((s, i) => ({ ...s, color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }));
  }, [dbProfile]);

  // ── Loading skeleton ───────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-16 mb-8" />
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-8">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-neutral-200 flex-shrink-0" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-7 bg-neutral-200 rounded w-48" />
                <div className="h-4 bg-neutral-200 rounded w-28" />
                <div className="flex gap-6 mt-2">
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                </div>
                <div className="h-4 bg-neutral-200 rounded w-full max-w-lg mt-2" />
                <div className="h-4 bg-neutral-200 rounded w-4/5 max-w-md" />
                <div className="flex gap-3 mt-4">
                  <div className="h-10 bg-neutral-200 rounded-full w-24" />
                  <div className="h-10 bg-neutral-200 rounded-full w-24" />
                  <div className="h-10 bg-neutral-200 rounded-full w-24" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────
  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Creator not found</h2>
            <p className="text-neutral-600 mb-4">This creator profile doesn't exist yet.</p>
            <button onClick={() => navigate('/creators')} className="px-6 py-3 bg-black text-white rounded-sm hover:bg-black/80">
              Browse Creators
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 pt-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8">

          <CreatorProfileHeader
            creatorId={creatorId}
            creator={creator}
            dbProfile={dbProfile}
            followerCount={followerCount}
            followingCount={followingCount}
            postCount={postCount}
          />

          <CreatorProfileTabs activeTab={activeTab} onSelectTab={handleSelectTab} />

          {/* ── Investment Tab ── */}
          {activeTab === 'investment' && (
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
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    simulatorMode ? 'bg-brand' : 'bg-neutral-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      simulatorMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            </div>

            {simulatorMode ? (
              // Simulator View — meta strip + compare card in a left rail beside the (enlarged
              // on md:+) chart, same split as myProfile/InvestmentTab.tsx's simulator.
              <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                  <div className="md:w-[42%] md:flex-shrink-0 space-y-4">
                    <SimulationSetupCard
                      simulation={selectedSimulation}
                      expanded={simulationExpanded}
                      onToggle={() => setSimulationExpanded(v => !v)}
                    />
                    <PerformanceSummaryCards simulation={selectedSimulation} />
                  </div>
                  <div className="flex-1">
                    <PerformanceTrendChart
                      chartData={simulationChartData}
                      timeRange={timeRange}
                      onTimeRangeChange={setTimeRange}
                    />
                  </div>
                </div>

                <PastSimulationsList
                  simulations={MOCK_SIMULATIONS}
                  selectedId={selectedSimulation.id}
                  onSelect={handleSelectSimulation}
                />

                <SimulationInsights insights={selectedSimulation.insights} />
              </div>
            ) : (
              // Real Portfolio View
              <div className="space-y-4">

            {/* Actual Portfolio Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-sm border border-brand/20">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Actual Portfolio
              </span>
              <span className="text-xs text-neutral-400">Real positions · Updated daily</span>
            </div>

            {/* Top Holding Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">Performance Chart</h2>
                </div>
                <div className="text-right">
                  <p className="text-base font-medium text-brand">+2.66%</p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-md p-4 w-full">
                <div className="h-48 min-h-[192px] w-full min-w-[300px]">
                  <ResponsiveContainer width="100%" height={192} minWidth={300} minHeight={192} key="portfolio-chart-container">
                    <LineChart data={portfolioData} id="portfolio-chart" key="portfolio-line-chart">
                      <XAxis dataKey="time" hide key="portfolio-xaxis" />
                      <YAxis hide domain={['dataMin', 'dataMax']} key="portfolio-yaxis" />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--brand)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        key="portfolio-line"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-3 mt-3 text-xs font-medium">
                  {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        timeRange === r ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:bg-white hover:text-black'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Portfolio Allocation */}
            <div>
              <h2 className="text-base font-semibold mb-3">Portfolio Allocation</h2>
              {allocationData ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                  {/* Donut Chart */}
                  <div className="w-48 h-48 min-w-48 min-h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={192} minHeight={192} key="allocation-chart-container">
                      <PieChart id="allocation-chart" key="allocation-pie-chart">
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          isAnimationActive={false}
                          key="allocation-pie"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell key={`allocation-cell-${entry.name}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="w-full sm:flex-1 space-y-3">
                    {allocationData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium truncate">{item.name}</span>
                        </div>
                        <span className="text-lg font-bold flex-shrink-0">{item.value}%</span>
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
            )}

          {/* ── Posts Tab ── */}
          {activeTab === 'posts' && <CreatorPostsTab creator={creator} posts={posts} />}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <CreatorAboutTab
              creator={creator}
              dbProfile={dbProfile}
              followerCount={followerCount}
              secondaryStat={{ label: 'Posts', value: postCount !== null ? postCount.toLocaleString() : creator.posts }}
            />
          )}

        </div>
      </div>
    </div>
  );
}
