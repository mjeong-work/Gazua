import type { Simulation } from '../data/simulations';
import { formatCurrency, formatPercent } from '../data/simulations';

interface Props {
  simulation: Simulation;
}

export default function PerformanceSummaryCards({ simulation }: Props) {
  const diff = simulation.differencePercent;
  const diffPositive = diff >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Hypothesis */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
        <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-3">
          Your Hypothesis
        </p>
        <p className="text-2xl font-bold text-violet-700">
          {formatPercent(simulation.hypothesisReturnPercent)}
        </p>
        <p className="text-sm text-violet-600 mt-1">
          {formatCurrency(simulation.hypothesisValue)}
        </p>
      </div>

      {/* Actual */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-3">
          Actual Performance
        </p>
        <p className="text-2xl font-bold text-green-700">
          {formatPercent(simulation.actualReturnPercent)}
        </p>
        <p className="text-sm text-green-600 mt-1">
          {formatCurrency(simulation.actualValue)}
        </p>
      </div>

      {/* Difference */}
      <div
        className={`rounded-2xl border p-5 ${
          diffPositive
            ? 'border-green-200 bg-green-50'
            : 'border-red-200 bg-red-50'
        }`}
      >
        <p
          className={`text-xs font-medium uppercase tracking-wide mb-3 ${
            diffPositive ? 'text-green-600' : 'text-red-400'
          }`}
        >
          Difference
        </p>
        <p
          className={`text-2xl font-bold ${
            diffPositive ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {formatPercent(simulation.differencePercent)}
        </p>
        <p
          className={`text-sm mt-1 ${
            diffPositive ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {formatCurrency(simulation.differenceValue)}
        </p>
      </div>
    </div>
  );
}
