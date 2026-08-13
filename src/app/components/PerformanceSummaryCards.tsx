import type { Simulation } from '../data/simulations';
import { formatCurrency, formatPercent } from '../data/simulations';
import CompareRow from './shared/CompareRow';

interface Props {
  simulation: Simulation;
}

// Hypothesis vs Actual, as a single compare card (2 rows + a thin difference badge) instead of
// three separate stat boxes — same pattern as myProfile/InvestmentTab.tsx's compare card.
export default function PerformanceSummaryCards({ simulation }: Props) {
  const diff = simulation.differencePercent;
  const diffPositive = diff >= 0;

  return (
    <div className="px-4 py-1 bg-white rounded-md border border-neutral-200 divide-y divide-neutral-100">
      <CompareRow
        label="Hypothesis"
        percent={simulation.hypothesisReturnPercent}
        amount={simulation.hypothesisValue}
        dotColorClass="bg-violet-500"
        valueColorClass="text-violet-700"
      />
      <CompareRow
        label="Actual"
        percent={simulation.actualReturnPercent}
        amount={simulation.actualValue}
        dotColorClass="bg-brand"
        valueColorClass="text-brand"
      />
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-neutral-600">Difference</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${diffPositive ? 'bg-green-50 text-brand' : 'bg-red-50 text-red-600'}`}>
          {formatPercent(diff)} · {diffPositive ? '+' : '-'}{formatCurrency(Math.abs(simulation.differenceValue))}
        </span>
      </div>
    </div>
  );
}
