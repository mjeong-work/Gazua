interface CompareRowProps {
  label: string;
  percent: number;
  amount: number;
  dotColorClass: string;
  valueColorClass: string;
}

// One row of a Hypothesis-vs-Actual (or any percent+amount) comparison card: colored dot, label,
// percent, and dollar amount. Two of these stacked in a card replace what used to be two separate
// side-by-side stat boxes — the "2행 통합" comparison card format.
export default function CompareRow({ label, percent, amount, dotColorClass, valueColorClass }: CompareRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColorClass}`} />
        <span className="text-sm text-neutral-600 truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <span className={`text-[15px] md:text-[17px] font-bold ${valueColorClass}`}>
          {percent >= 0 ? '+' : ''}{percent.toFixed(1)}%
        </span>
        <span className="text-xs text-neutral-400">
          ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}
