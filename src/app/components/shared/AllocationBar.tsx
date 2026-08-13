import { parseAllocation } from '../../utils/creator';
import type { Json } from '../../../types/database';

// Same 4-color default palette CreatorProfileInvestment.tsx / InvestmentTab.tsx use for the
// allocation pie chart, extended for portfolios with more than 4 real slices. Kept local to this
// component (rather than re-importing from either) so this bar owns its own color assignment.
const ALLOCATION_COLORS = ['var(--brand)', 'var(--mint)', '#f43f5e', '#e5e7eb', '#60a5fa', '#a78bfa'];

interface AllocationBarProps {
  raw: Json | null | undefined;
  className?: string;
}

// "Verified Allocation" — a horizontal stacked bar instead of a donut so it's compact enough to
// sit above the fold, next to the profile header. Renders nothing for "not disclosed yet" (same
// as the pie-chart views elsewhere) — never synthesizes a fake breakdown. The legend is a plain
// inline text list on mobile and gains color swatches at md:+, mirroring StatRow's approach.
export default function AllocationBar({ raw, className = '' }: AllocationBarProps) {
  const slices = parseAllocation(raw);
  if (slices.length === 0) return null;
  const colored = slices.map((s, i) => ({ ...s, color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }));

  return (
    <div className={className}>
      <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">Verified Allocation</h3>
      <div className="flex h-2 md:h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        {colored.map((s) => (
          <div key={s.name} style={{ width: `${s.value}%`, backgroundColor: s.color }} title={`${s.name} ${s.value}%`} />
        ))}
      </div>
      {/* Compact text legend (mobile) */}
      <div className="flex md:hidden flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
        {colored.map((s) => (
          <span key={s.name} className="text-[10px] text-neutral-500">{s.name} {s.value}%</span>
        ))}
      </div>
      {/* Detailed swatch legend (desktop) */}
      <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
        {colored.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-medium text-neutral-700">{s.name}</span>
            <span className="text-neutral-400">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
