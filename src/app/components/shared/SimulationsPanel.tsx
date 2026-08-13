import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, hideChartLabel } from '../../utils/chartTooltip';
import { useServiceQuery, reportServiceError } from '../../hooks/useServiceQuery';
import {
  getSimulations,
  createSimulation,
  getSimulationPerformance,
  type Simulation,
  type SimulationPerformance,
} from '../../../lib/services/simulations.service';
import { Button } from '../ui/button';
import Overlay from '../myProfile/Overlay';
import CompareRow from './CompareRow';
import ChartCard from './ChartCard';

interface SimulationsPanelProps {
  /** Whose simulations to show — null when there's no real profile behind this view (a small
   * demo/MOCK_CREATOR with no dbProfile row), in which case there's nothing to query. */
  userId: string | null;
  /** True on the owner's own profile (Portfolio Simulator can create new ones); false on a
   * creator's public profile (read-only view of their real simulations). */
  editable: boolean;
}

interface NewHoldingRow { symbol: string; amount: string; expectedReturnPercent: string; }

function getTodayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A straight-line trend between two real endpoints (capital at t0, the computed value at "now")
 * — not a fabricated daily walk. Honest about what it is: a trend indicator, not a claim about
 * day-to-day price history this app doesn't have. */
function buildChartSeries(capital: number, endValue: number, points = 24) {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    return { time: `t${i}`, value: capital + (endValue - capital) * t };
  });
}

export default function SimulationsPanel({ userId, editable }: SimulationsPanelProps) {
  const { data: simulations, loading, error, refetch } = useServiceQuery(
    () => getSimulations(userId!),
    [userId],
    { enabled: !!userId, label: 'simulations' },
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showPastList, setShowPastList] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (simulations && simulations.length > 0 && !simulations.some(s => s.id === selectedId)) {
      setSelectedId(simulations[0].id);
    }
  }, [simulations, selectedId]);

  const selected = simulations?.find(s => s.id === selectedId) ?? null;

  // Performance is a separate, live fetch (real current prices) from the simulation list itself
  // — re-run whenever the selected simulation changes, not part of the list load.
  const [performance, setPerformance] = useState<SimulationPerformance | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  useEffect(() => {
    if (!selected) { setPerformance(null); return; }
    let cancelled = false;
    setPerfLoading(true);
    getSimulationPerformance(selected).then(p => { if (!cancelled) { setPerformance(p); setPerfLoading(false); } });
    return () => { cancelled = true; };
  }, [selected]);

  // ── New Simulation form ─────────────────────────────────────
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [capital, setCapital] = useState('');
  const [holdingRows, setHoldingRows] = useState<NewHoldingRow[]>([{ symbol: '', amount: '', expectedReturnPercent: '' }]);
  const [rationale, setRationale] = useState('');
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setName(''); setStartDate(''); setCapital('');
    setHoldingRows([{ symbol: '', amount: '', expectedReturnPercent: '' }]);
    setRationale('');
  };
  const closeForm = () => { setShowNewForm(false); resetForm(); };

  const addHoldingRow = () => setHoldingRows(r => [...r, { symbol: '', amount: '', expectedReturnPercent: '' }]);
  const removeHoldingRow = (i: number) => setHoldingRows(r => r.filter((_, idx) => idx !== i));
  const updateHoldingRow = (i: number, field: keyof NewHoldingRow, value: string) =>
    setHoldingRows(r => r.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));

  const enteredHoldingsTotal = holdingRows.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
  const capitalNum = parseFloat(capital) || 0;
  const remainingCash = capitalNum - enteredHoldingsTotal;
  const canCreate = name.trim().length > 0 && capitalNum > 0 && remainingCash >= 0;

  const handleCreate = async () => {
    if (!userId || !canCreate || creating) return;
    setCreating(true);
    const holdings = holdingRows
      .filter(h => h.symbol.trim() && parseFloat(h.amount) > 0)
      .map(h => ({
        symbol: h.symbol.trim().toUpperCase(),
        amount: parseFloat(h.amount),
        expectedReturnPercent: parseFloat(h.expectedReturnPercent) || 0,
      }));
    const { data, error: err } = await createSimulation({
      userId,
      name: name.trim(),
      startDate: startDate || undefined,
      capital: capitalNum,
      holdings,
      rationale: rationale.trim() || undefined,
    });
    setCreating(false);
    if (err || !data) {
      reportServiceError(err ?? 'Failed to create simulation.', { label: 'simulation' });
      return;
    }
    closeForm();
    setSelectedId(data.id);
    refetch();
  };

  // ── Empty / unavailable states ──────────────────────────────
  if (!userId) {
    return (
      <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
        <p className="text-sm text-neutral-500">Portfolio simulations aren't available for this profile yet.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="h-40 bg-neutral-50 rounded-md border border-neutral-200 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
        <p className="text-sm text-neutral-500 mb-2">Couldn't load simulations.</p>
        <button onClick={refetch} className="text-xs font-medium text-brand hover:underline">Try again</button>
      </div>
    );
  }

  if ((!simulations || simulations.length === 0) && !editable) {
    return (
      <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
        <p className="text-sm text-neutral-500">This creator hasn't run any simulations yet.</p>
      </div>
    );
  }

  const holdingSummary = selected
    ? selected.holdings.length > 0
      ? `${selected.holdings.length} stock${selected.holdings.length > 1 ? 's' : ''}`
      : 'All cash'
    : '';
  const cashAmount = selected
    ? Math.max(selected.capital - selected.holdings.reduce((sum, h) => sum + h.amount, 0), 0)
    : 0;

  return (
    <div className="space-y-4">
      {(!simulations || simulations.length === 0) && editable ? (
        <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
          <p className="text-sm font-medium text-neutral-700 mb-1">No simulations yet</p>
          <p className="text-xs text-neutral-500 mb-4">Test a hypothesis against the market with a starting capital and a set of holdings.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-full text-xs font-medium hover:bg-black/80 transition-colors"
          >
            <AddIcon sx={{ fontSize: 14 }} />
            New Simulation
          </button>
        </div>
      ) : (
        <>
          {/* Picker + Create */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 overflow-x-auto flex-1 pb-1">
              {simulations!.map(sim => (
                <button
                  key={sim.id}
                  onClick={() => { setSelectedId(sim.id); setExpanded(false); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    sim.id === selectedId ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {sim.name}
                </button>
              ))}
            </div>
            {editable && (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium hover:bg-black/80 transition-colors"
              >
                <AddIcon sx={{ fontSize: 14 }} />
                New
              </button>
            )}
          </div>

          {selected && (
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
              <div className="md:w-[42%] md:flex-shrink-0 space-y-4">
                {/* Setup card */}
                <div onClick={() => setExpanded(v => !v)} className="p-4 bg-white rounded-md border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <svg className={`w-4 h-4 text-neutral-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {!expanded ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Period</p>
                        <p className="text-xs font-medium text-neutral-700">{selected.startDate}{selected.endDate ? ` – ${selected.endDate}` : ' – Present'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Holdings</p>
                        <p className="text-xs font-medium text-neutral-700">{holdingSummary}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Capital</p>
                        <p className="text-xs font-medium text-neutral-700">${selected.capital.toLocaleString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Holdings</label>
                        <div className="space-y-1.5">
                          {selected.holdings.map(h => (
                            <div key={h.symbol} className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs flex items-center justify-between">
                              <span>{h.symbol}</span>
                              <span className="text-neutral-500">${h.amount.toLocaleString()} · target {h.expectedReturnPercent >= 0 ? '+' : ''}{h.expectedReturnPercent.toFixed(1)}%</span>
                            </div>
                          ))}
                          {cashAmount > 0 && (
                            <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs flex items-center justify-between">
                              <span>Cash</span><span className="text-neutral-500">${cashAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {selected.rationale && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1.5">Rationale</label>
                          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-600">{selected.rationale}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Compare card */}
                <div>
                  <h2 className="text-sm font-semibold mb-2">Hypothesis vs Actual</h2>
                  {perfLoading || !performance ? (
                    <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
                      <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse mx-auto" />
                    </div>
                  ) : performance.actualPercent === null ? (
                    <div className="p-6 bg-neutral-50 rounded-md border border-neutral-200 text-center">
                      <p className="text-sm font-medium text-neutral-700 mb-1">
                        {selected.holdings.length === 0 ? 'All-cash simulation' : 'Live pricing unavailable'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {selected.holdings.length === 0
                          ? 'This simulation has no holdings, so there\'s nothing to track against the market yet.'
                          : 'Actual performance needs a live quote for every holding — one or more aren\'t available right now.'}
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-1 bg-white rounded-md border border-neutral-200 divide-y divide-neutral-100">
                      <CompareRow
                        label="Hypothesis"
                        percent={performance.hypothesisPercent}
                        amount={performance.hypothesisValue}
                        dotColorClass="bg-violet-500"
                        valueColorClass="text-violet-700"
                      />
                      <CompareRow
                        label="Actual"
                        percent={performance.actualPercent}
                        amount={performance.actualValue!}
                        dotColorClass="bg-brand"
                        valueColorClass="text-brand"
                      />
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-neutral-600">Difference</span>
                        {(() => {
                          const diff = performance.actualPercent! - performance.hypothesisPercent;
                          const diffValue = performance.actualValue! - performance.hypothesisValue;
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${diff >= 0 ? 'bg-green-50 text-brand' : 'bg-red-50 text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}% · {diffValue >= 0 ? '+' : '-'}${Math.abs(diffValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart + past simulations */}
              <div className="flex-1 space-y-3">
                {performance && performance.actualPercent !== null && (
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
                        <Line data={buildChartSeries(selected.capital, performance.actualValue!)} type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="sim-actual" name="Actual" />
                        <Line data={buildChartSeries(selected.capital, performance.hypothesisValue)} type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} key="sim-hypothesis" name="Hypothesis" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {simulations!.length > 1 && (
                  <button onClick={() => setShowPastList(v => !v)} className="text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                    {showPastList ? 'Hide Past Simulations' : 'View Past Simulations →'}
                  </button>
                )}
              </div>
            </div>
          )}

          {showPastList && (
            <div className="p-4 bg-white rounded-md border border-neutral-200 space-y-2.5">
              <h3 className="font-semibold text-sm mb-3">Past Simulations</h3>
              {simulations!.map(sim => (
                <div
                  key={sim.id}
                  onClick={() => { setSelectedId(sim.id); setShowPastList(false); }}
                  className="p-3 bg-neutral-50 rounded border border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-medium text-sm">{sim.name}</h4>
                    <span className="text-xs text-neutral-500">{sim.startDate}{sim.endDate ? ` – ${sim.endDate}` : ' – Present'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-600">
                    <span>{sim.holdings.length > 0 ? `${sim.holdings.length} holding${sim.holdings.length > 1 ? 's' : ''}` : 'All cash'}</span>
                    <span>·</span>
                    <span>${sim.capital.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── New Simulation modal ── */}
      {showNewForm && (
        <Overlay onClose={closeForm}>
          <div className="bg-white rounded-md shadow-xl w-[min(520px,90vw)] max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">New Simulation</h2>
              <button onClick={closeForm} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Simulation Name <span className="text-red-400">*</span></label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. AI Growth Thesis"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    max={getTodayISODate()}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Initial Capital ($) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={capital}
                    onChange={e => setCapital(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-600">Hypothetical Holdings</label>
                  <button onClick={addHoldingRow} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-black font-medium">
                    <AddIcon sx={{ fontSize: 14 }} />
                    Add holding
                  </button>
                </div>
                <div className="space-y-2">
                  {holdingRows.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={h.symbol}
                        onChange={e => updateHoldingRow(i, 'symbol', e.target.value.toUpperCase())}
                        placeholder="NVDA"
                        className="w-24 px-3 py-2 border border-neutral-200 rounded-sm text-xs font-mono focus:outline-none focus:border-black transition-colors"
                      />
                      <input
                        type="number"
                        min="0"
                        value={h.amount}
                        onChange={e => updateHoldingRow(i, 'amount', e.target.value)}
                        placeholder="$ Amount"
                        className="flex-1 px-3 py-2 border border-neutral-200 rounded-sm text-xs focus:outline-none focus:border-black transition-colors"
                      />
                      <input
                        type="number"
                        value={h.expectedReturnPercent}
                        onChange={e => updateHoldingRow(i, 'expectedReturnPercent', e.target.value)}
                        placeholder="Target %"
                        className="w-24 px-3 py-2 border border-neutral-200 rounded-sm text-xs focus:outline-none focus:border-black transition-colors"
                      />
                      {holdingRows.length > 1 && (
                        <button onClick={() => removeHoldingRow(i)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <RemoveCircleOutlineIcon sx={{ fontSize: 16 }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-2 ${remainingCash < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                  {capital
                    ? remainingCash < 0
                      ? `Holdings exceed capital by $${Math.abs(remainingCash).toLocaleString()}`
                      : `Remaining cash: $${remainingCash.toLocaleString()}`
                    : 'Target % is your own hypothesis for that holding — used to compute your overall Hypothesis return.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Rationale (optional)</label>
                <textarea
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  rows={3}
                  placeholder="Why are you testing this scenario?"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Button onClick={handleCreate} disabled={!canCreate || creating} variant="pill" size="pill" className="flex-1 disabled:opacity-40">
                {creating ? 'Creating…' : 'Create Simulation'}
              </Button>
              <Button onClick={closeForm} variant="pillOutline" size="pill" className="flex-1">Cancel</Button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
