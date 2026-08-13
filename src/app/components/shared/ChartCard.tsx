import type { ReactNode } from 'react';

interface LegendItem {
  label: string;
  colorClass?: string;
  /** Dashed line swatch (e.g. a "Hypothesis" series) instead of a solid color block. */
  dashed?: boolean;
  dashColor?: string;
}

interface ChartCardProps {
  title: string;
  legend?: LegendItem[];
  /** Tailwind height classes for the chart area, e.g. "h-[110px] md:h-[280px]" — mobile stays
   * compact, desktop gets the bigger, more-detail-worthy size. */
  heightClassName: string;
  children: ReactNode;
  className?: string;
}

// Wraps a Recharts <ResponsiveContainer> (passed as children) with a title and an optional
// legend row, at a caller-controlled height. Used by both the simulation chart and (eventually)
// any other trend chart that needs the same title+chart+legend card shell.
export default function ChartCard({ title, legend, heightClassName, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-neutral-50 rounded-md p-4 ${className}`}>
      <h3 className="text-xs font-semibold text-neutral-500 mb-2">{title}</h3>
      <div className={`w-full ${heightClassName}`}>{children}</div>
      {legend && legend.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-3">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              {l.dashed ? (
                <div className="w-3" style={{ borderTop: `2px dashed ${l.dashColor ?? '#8b5cf6'}` }} />
              ) : (
                <div className={`w-3 h-0.5 ${l.colorClass ?? 'bg-brand'}`} />
              )}
              <span className="text-xs font-medium">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
