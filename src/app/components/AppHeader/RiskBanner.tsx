import { useSearchParams } from 'react-router';

// Self-contained (reads the ticker query param itself) so it can be mounted once in
// AppHeader without threading state through both the mobile and desktop header blocks,
// which render via CSS breakpoints rather than a single JS conditional.
export default function RiskBanner() {
  const [searchParams] = useSearchParams();
  const ticker = searchParams.get('ticker')?.toUpperCase() ?? null;

  if (!ticker) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 py-1.5 px-4 text-center text-xs shrink-0">
      Content mentioning ${ticker} is for educational discussion only and is not a recommendation to buy or sell.
    </div>
  );
}
