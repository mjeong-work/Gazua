interface Stat {
  label: string;
  value: string;
}

interface StatRowProps {
  stats: Stat[];
  className?: string;
}

// followers/following/posts (or any label/value triple). A single 3-column grid that's a plain
// compact line on mobile and gains card chrome at md:+ — one component instead of two variants,
// since the only real difference between the mobile and desktop treatments is Tailwind classes.
export default function StatRow({ stats, className = '' }: StatRowProps) {
  return (
    <div className={`grid grid-cols-3 gap-2 md:gap-3 ${className}`}>
      {stats.map((s) => (
        <div key={s.label} className="text-center md:text-left md:rounded-md md:border md:border-neutral-200 md:bg-white md:px-4 md:py-3">
          <div className="text-sm font-bold md:text-lg whitespace-nowrap">{s.value}</div>
          <div className="text-[11px] text-neutral-500 md:text-xs md:mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
