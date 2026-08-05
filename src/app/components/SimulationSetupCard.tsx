import { useState, useEffect } from 'react';
import ChevronDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { Simulation } from '../data/simulations';
import { formatDateRange } from '../data/simulations';

interface FormHolding {
  symbol: string;
  amount: string;
  expectedReturn: string;
}

interface FormState {
  title: string;
  startDate: string;
  endDate: string;
  capital: string;
  holdings: FormHolding[];
}

function initForm(sim: Simulation): FormState {
  return {
    title: sim.title,
    startDate: sim.startDate,
    endDate: sim.endDate,
    capital: String(sim.capital),
    holdings: sim.holdings.map(h => ({
      symbol: h.symbol,
      amount: String(h.allocationAmount),
      expectedReturn: String(h.expectedReturnPercent),
    })),
  };
}

interface Props {
  simulation: Simulation;
  expanded: boolean;
  onToggle: () => void;
}

export default function SimulationSetupCard({ simulation, expanded, onToggle }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(simulation));
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    setForm(initForm(simulation));
    setRan(false);
  }, [simulation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field: keyof Omit<FormState, 'holdings'>, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const updateHolding = (index: number, field: keyof FormHolding, value: string) =>
    setForm(f => ({
      ...f,
      holdings: f.holdings.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));

  const addHolding = () =>
    setForm(f => ({ ...f, holdings: [...f.holdings, { symbol: '', amount: '', expectedReturn: '' }] }));

  const removeHolding = (index: number) =>
    setForm(f => ({ ...f, holdings: f.holdings.filter((_, i) => i !== index) }));

  const handleRun = () => {
    setRunning(true);
    setRan(false);
    setTimeout(() => {
      setRunning(false);
      setRan(true);
    }, 800);
  };

  const holdingSummary = simulation.holdings.map(h => h.symbol).join(', ');
  const cashLabel = simulation.cashAmount > 0 ? ' + Cash' : '';

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
      >
        <span className="font-semibold text-neutral-900">Simulation Setup</span>
        {expanded ? (
          <ChevronUpIcon sx={{ fontSize: 20, color: '#6b7280' }} />
        ) : (
          <ChevronDownIcon sx={{ fontSize: 20, color: '#6b7280' }} />
        )}
      </button>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-5 pb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600 border-t border-neutral-100">
          <span>
            <span className="text-neutral-400 mr-1">Period:</span>
            {formatDateRange(simulation.startDate, simulation.endDate)}
          </span>
          <span>
            <span className="text-neutral-400 mr-1">Holdings:</span>
            {holdingSummary}{cashLabel}
          </span>
          <span>
            <span className="text-neutral-400 mr-1">Capital:</span>
            ${simulation.capital.toLocaleString()}
          </span>
        </div>
      )}

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-neutral-100 px-5 py-5 space-y-5">
          {/* Basic fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Simulation Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => updateField('startDate', e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => updateField('endDate', e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Starting Capital ($)</label>
              <input
                type="number"
                value={form.capital}
                onChange={e => updateField('capital', e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {/* Holdings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Holdings</span>
              <button
                onClick={addHolding}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                <AddIcon sx={{ fontSize: 14 }} />
                Add holding
              </button>
            </div>

            <div className="space-y-2">
              {/* Column labels */}
              <div className="grid grid-cols-12 gap-2 text-xs text-neutral-400 px-1">
                <span className="col-span-3">Symbol</span>
                <span className="col-span-4">Allocation ($)</span>
                <span className="col-span-4">Expected Return (%)</span>
              </div>
              {form.holdings.map((h, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="NVDA"
                    value={h.symbol}
                    onChange={e => updateHolding(i, 'symbol', e.target.value.toUpperCase())}
                    className="col-span-3 border border-neutral-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <input
                    type="number"
                    placeholder="30000"
                    value={h.amount}
                    onChange={e => updateHolding(i, 'amount', e.target.value)}
                    className="col-span-4 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <input
                    type="number"
                    placeholder="25"
                    value={h.expectedReturn}
                    onChange={e => updateHolding(i, 'expectedReturn', e.target.value)}
                    className="col-span-4 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <button
                    onClick={() => removeHolding(i)}
                    className="col-span-1 flex justify-center text-neutral-300 hover:text-red-400 transition-colors"
                  >
                    <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Run button + feedback */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleRun}
              disabled={running}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {running ? 'Simulating…' : 'Run Simulation'}
            </button>
            {ran && (
              <span className="text-sm text-green-600 font-medium">
                Simulation complete!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
