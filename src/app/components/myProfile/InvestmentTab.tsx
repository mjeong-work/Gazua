import { useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, hideChartLabel } from '../../utils/chartTooltip';
import { ACTUAL_PORTFOLIO_ENABLED } from '../../featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { parseAllocation } from '../../utils/creator';
import { Button } from '../ui/button';
import Overlay from './Overlay';
import CompareRow from '../shared/CompareRow';
import ChartCard from '../shared/ChartCard';

// Same 4-color default palette CreatorProfileInvestment.tsx uses for the public view, extended
// for portfolios with more than 4 real slices.
const ALLOCATION_COLORS = ['var(--brand)', 'var(--mint)', '#f43f5e', '#e5e7eb', '#60a5fa', '#a78bfa'];

interface SimHolding { symbol: string; amount: number; }
interface Simulation {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  capital: number;
  holdings: SimHolding[];
  rationale?: string;
  hypothesisPercent: number | null;
  actualPercent: number | null;
}

const INIT_SIMULATIONS: Simulation[] = [
  {
    id: 1,
    name: 'AI Chip Growth Thesis',
    startDate: 'Jan 1, 2026',
    endDate: 'Jun 1, 2026',
    capital: 50000,
    holdings: [{ symbol: 'NVDA', amount: 30000 }, { symbol: 'TSLA', amount: 15000 }],
    rationale: 'Testing AI chip sector growth thesis through NVDA exposure, with EV market diversification via TSLA and a conservative cash buffer for volatility management.',
    hypothesisPercent: 15.0,
    actualPercent: 8.5,
  },
];

// Local (not UTC) YYYY-MM-DD, suitable for a date input's min attribute.
function getTodayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fully self-contained tab — the simulator/actual-portfolio toggle, all simulation state, and
// the New Simulation modal live entirely here since nothing outside this tab needs any of it.
export default function InvestmentTab() {
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [simulatorMode, setSimulatorMode] = useState(true);
  const [simulationExpanded, setSimulationExpanded] = useState(false);
  const [showSimulationList, setShowSimulationList] = useState(false);

  const [simulations, setSimulations] = useState<Simulation[]>(INIT_SIMULATIONS);
  const [selectedSimulationId, setSelectedSimulationId] = useState(INIT_SIMULATIONS[0].id);
  const [showNewSimulationForm, setShowNewSimulationForm] = useState(false);
  const [newSimName, setNewSimName] = useState('');
  const [newSimStartDate, setNewSimStartDate] = useState('');
  const [newSimCapital, setNewSimCapital] = useState('');
  const [newSimHoldings, setNewSimHoldings] = useState([{ symbol: '', amount: '' }]);
  const [newSimRationale, setNewSimRationale] = useState('');

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

  const selectedSimulation = simulations.find(s => s.id === selectedSimulationId) ?? simulations[0];
  const selectedSimCash = Math.max(selectedSimulation.capital - selectedSimulation.holdings.reduce((sum, h) => sum + h.amount, 0), 0);
  const hasSimPerformance = selectedSimulation.hypothesisPercent !== null && selectedSimulation.actualPercent !== null;
  const simHypothesisValue = hasSimPerformance ? selectedSimulation.capital * (1 + selectedSimulation.hypothesisPercent! / 100) : 0;
  const simActualValue = hasSimPerformance ? selectedSimulation.capital * (1 + selectedSimulation.actualPercent! / 100) : 0;
  const simDiffPercent = hasSimPerformance ? selectedSimulation.actualPercent! - selectedSimulation.hypothesisPercent! : 0;
  const simDiffValue = simActualValue - simHypothesisValue;

  const handleAddHoldingRow = () => setNewSimHoldings(prev => [...prev, { symbol: '', amount: '' }]);
  const handleRemoveHoldingRow = (index: number) => setNewSimHoldings(prev => prev.filter((_, i) => i !== index));
  const handleHoldingChange = (index: number, field: 'symbol' | 'amount', value: string) => {
    setNewSimHoldings(prev => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const resetNewSimForm = () => {
    setNewSimName('');
    setNewSimStartDate('');
    setNewSimCapital('');
    setNewSimHoldings([{ symbol: '', amount: '' }]);
    setNewSimRationale('');
  };

  const handleCloseNewSimForm = () => {
    setShowNewSimulationForm(false);
    resetNewSimForm();
  };

  const handleCreateSimulation = () => {
    const capitalNum = parseFloat(newSimCapital);
    if (!newSimName.trim() || !capitalNum || capitalNum <= 0) return;
    if (newSimStartDate && newSimStartDate < getTodayISODate()) return;

    const holdings = newSimHoldings
      .filter(h => h.symbol.trim() && parseFloat(h.amount) > 0)
      .map(h => ({ symbol: h.symbol.trim().toUpperCase(), amount: parseFloat(h.amount) }));

    const newSim: Simulation = {
      id: Date.now(),
      name: newSimName.trim(),
      startDate: newSimStartDate
        ? new Date(newSimStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not set',
      capital: capitalNum,
      holdings,
      rationale: newSimRationale.trim() || undefined,
      hypothesisPercent: null,
      actualPercent: null,
    };

    setSimulations(prev => [newSim, ...prev]);
    setSelectedSimulationId(newSim.id);
    setSimulationExpanded(true);
    handleCloseNewSimForm();
  };

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
        /* ── Simulator View ── */
        <div className="space-y-4">
          {/* Simulation Picker + Create */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 overflow-x-auto flex-1 pb-1">
              {simulations.map(sim => (
                <button
                  key={sim.id}
                  onClick={() => { setSelectedSimulationId(sim.id); setSimulationExpanded(false); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    sim.id === selectedSimulationId ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {sim.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewSimulationForm(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium hover:bg-black/80 transition-colors"
            >
              <AddIcon sx={{ fontSize: 14 }} />
              New
            </button>
          </div>

          {/* Setup + Compare (left column on md:+) beside the chart (right column on md:+).
              On mobile these two groups simply stack in the same order they always have — the
              grouping only matters once flex-row kicks in at md:. */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            <div className="md:w-[42%] md:flex-shrink-0 space-y-4">
              {/* Simulation Setup */}
              <div onClick={() => setSimulationExpanded(!simulationExpanded)} className="p-4 bg-white rounded-md border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">{selectedSimulation.name}</h2>
                  <svg className={`w-4 h-4 text-neutral-500 transition-transform flex-shrink-0 ${simulationExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {!simulationExpanded ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Period</p>
                      <p className="text-xs font-medium text-neutral-700">{selectedSimulation.startDate}{selectedSimulation.endDate ? ` – ${selectedSimulation.endDate}` : ' – Present'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Holdings</p>
                      <p className="text-xs font-medium text-neutral-700">
                        {selectedSimulation.holdings.length > 0 ? `${selectedSimulation.holdings.length} stock${selectedSimulation.holdings.length > 1 ? 's' : ''}` : 'All cash'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Capital</p>
                      <p className="text-xs font-medium text-neutral-700">${selectedSimulation.capital.toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Start Date</label>
                        <div className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-xs">{selectedSimulation.startDate}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Initial Capital</label>
                        <div className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-xs">${selectedSimulation.capital.toLocaleString()}</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1.5">Hypothetical Holdings</label>
                      <div className="space-y-1.5">
                        {selectedSimulation.holdings.map(h => (
                          <div key={h.symbol} className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs flex items-center justify-between">
                            <span>{h.symbol}</span><span className="text-neutral-500">${h.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        {selectedSimCash > 0 && (
                          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs flex items-center justify-between">
                            <span>Cash</span><span className="text-neutral-500">${selectedSimCash.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedSimulation.rationale && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Rationale</label>
                        <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-600">{selectedSimulation.rationale}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Compare card — Hypothesis vs Actual, 2 rows + a thin difference badge */}
              <div>
                <h2 className="text-sm font-semibold mb-2">Hypothesis vs Actual</h2>
                {!hasSimPerformance ? (
                  <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
                    <p className="text-sm font-medium text-neutral-700 mb-1">This simulation just started</p>
                    <p className="text-xs text-neutral-500">Performance data will appear here once enough time has passed to compare your hypothesis against the market.</p>
                  </div>
                ) : (
                  <div className="px-4 py-1 bg-white rounded-md border border-neutral-200 divide-y divide-neutral-100">
                    <CompareRow
                      label="Hypothesis"
                      percent={selectedSimulation.hypothesisPercent!}
                      amount={simHypothesisValue}
                      dotColorClass="bg-violet-500"
                      valueColorClass="text-violet-700"
                    />
                    <CompareRow
                      label="Actual"
                      percent={selectedSimulation.actualPercent!}
                      amount={simActualValue}
                      dotColorClass="bg-brand"
                      valueColorClass="text-brand"
                    />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-neutral-600">Difference</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${simDiffPercent >= 0 ? 'bg-green-50 text-brand' : 'bg-red-50 text-red-600'}`}>
                        {simDiffPercent >= 0 ? '+' : ''}{simDiffPercent.toFixed(1)}% · {simDiffValue >= 0 ? '+' : '-'}${Math.abs(simDiffValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart (enlarged on md:+) + View Past Simulations */}
            <div className="flex-1 space-y-3">
              {hasSimPerformance && (
                <ChartCard
                  title="Performance"
                  heightClassName="h-[110px] md:h-[260px] lg:h-[320px]"
                  legend={[
                    { label: 'Actual', colorClass: 'bg-brand' },
                    { label: 'Hypothesis', dashed: true, dashColor: '#8b5cf6' },
                  ]}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart key="sim-chart">
                      <XAxis dataKey="time" hide key="sim-xaxis" />
                      <YAxis hide domain={['dataMin', 'dataMax']} key="sim-yaxis" />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                      <Line data={portfolioData} type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="sim-actual" name="Actual" />
                      <Line data={portfolioData.map(d => ({ ...d, value: d.value * 1.06 }))} type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} key="sim-hypothesis" name="Hypothesis" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              <button onClick={() => setShowSimulationList(!showSimulationList)} className="text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                {showSimulationList ? 'Hide Past Simulations' : 'View Past Simulations →'}
              </button>
            </div>
          </div>

          {showSimulationList && (
            <div className="p-4 bg-white rounded-md border border-neutral-200 space-y-2.5">
              <h3 className="font-semibold text-sm mb-3">Past Simulations</h3>
              {[
                { name: 'Tech Growth Portfolio', date: 'Dec 1, 2025 – Mar 1, 2026', holdings: '3 Holdings', capital: '$75,000', hypo: '+22.0%', actual: '+18.5%', diff: '-3.5%', diffPos: false },
                { name: 'Conservative Value Play', date: 'Sep 1, 2025 – Dec 1, 2025', holdings: '4 Holdings', capital: '$100,000', hypo: '+8.0%', actual: '+11.2%', diff: '+3.2%', diffPos: true },
                { name: 'Crypto Diversification Test', date: 'Jun 1, 2025 – Sep 1, 2025', holdings: '5 Holdings', capital: '$25,000', hypo: '+35.0%', actual: '-5.2%', diff: '-40.2%', diffPos: false },
              ].map((sim) => (
                <div key={sim.name} className="p-3 bg-neutral-50 rounded border border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-medium text-sm">{sim.name}</h4>
                    <span className="text-xs text-neutral-500">{sim.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-600 mb-1.5">
                    <span>{sim.holdings}</span><span>·</span><span>{sim.capital}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5"><span className="text-neutral-500">Hypothesis:</span><span className="font-medium text-purple-700">{sim.hypo}</span></div>
                    <div className="flex items-center gap-1.5"><span className="text-neutral-500">Actual:</span><span className={`font-medium ${sim.diffPos ? 'text-brand' : 'text-red-700'}`}>{sim.actual}</span></div>
                    <div className="flex items-center gap-1.5"><span className="text-neutral-500">Diff:</span><span className={`font-medium ${sim.diffPos ? 'text-brand' : 'text-red-700'}`}>{sim.diff}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* ── New Simulation Modal ── */}
      {showNewSimulationForm && (() => {
        const enteredHoldingsTotal = newSimHoldings.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
        const remainingCash = (parseFloat(newSimCapital) || 0) - enteredHoldingsTotal;
        const canCreate = newSimName.trim().length > 0 && parseFloat(newSimCapital) > 0;

        return (
          <Overlay onClose={handleCloseNewSimForm}>
            <div className="bg-white rounded-md shadow-xl w-[min(520px,90vw)] max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">New Simulation</h2>
                <button onClick={handleCloseNewSimForm} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Simulation Name <span className="text-red-400">*</span></label>
                  <input
                    value={newSimName}
                    onChange={e => setNewSimName(e.target.value)}
                    placeholder="e.g. AI Growth Thesis"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={newSimStartDate}
                      min={getTodayISODate()}
                      onChange={e => setNewSimStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Initial Capital ($) <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      min="0"
                      value={newSimCapital}
                      onChange={e => setNewSimCapital(e.target.value)}
                      placeholder="50000"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Hypothetical Holdings</label>
                  <div className="space-y-2">
                    {newSimHoldings.map((holding, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={holding.symbol}
                          onChange={e => handleHoldingChange(i, 'symbol', e.target.value.toUpperCase())}
                          placeholder="Symbol (e.g. NVDA)"
                          className="flex-1 px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                        />
                        <input
                          type="number"
                          min="0"
                          value={holding.amount}
                          onChange={e => handleHoldingChange(i, 'amount', e.target.value)}
                          placeholder="$ Amount"
                          className="w-32 px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                        />
                        {newSimHoldings.length > 1 && (
                          <button onClick={() => handleRemoveHoldingRow(i)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors">
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddHoldingRow} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                    <AddIcon sx={{ fontSize: 14 }} />
                    Add holding
                  </button>
                  {newSimCapital && (
                    <p className={`text-xs mt-2 ${remainingCash < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                      {remainingCash < 0
                        ? `Holdings exceed capital by $${Math.abs(remainingCash).toLocaleString()}`
                        : `Remaining cash: $${remainingCash.toLocaleString()}`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Rationale (optional)</label>
                  <textarea
                    value={newSimRationale}
                    onChange={e => setNewSimRationale(e.target.value)}
                    rows={3}
                    placeholder="Why are you testing this scenario?"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <Button
                  onClick={handleCreateSimulation}
                  disabled={!canCreate}
                  variant="pill"
                  size="pill"
                  className="flex-1 disabled:opacity-40"
                >
                  Create Simulation
                </Button>
                <Button onClick={handleCloseNewSimForm} variant="pillOutline" size="pill" className="flex-1">Cancel</Button>
              </div>
            </div>
          </Overlay>
        );
      })()}
    </div>
  );
}
