import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import AppHeader from './AppHeader';
import VerifiedBadge from './VerifiedBadge';
import { Badge } from './ui/badge';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, showChartLabel } from '../utils/chartTooltip';
import { isCreatorVerified } from '../utils/creator';
import { getTickerInfo, getLiveTickerChart, getTickerMetadata, hasLiveMarketData, type LiveTickerInfo, type TickerSearchResult, type TimeRange } from '../../lib/market.service';
import { getPostsByTicker } from '../../lib/services/posts.service';
import { reportServiceError } from '../hooks/useServiceQuery';
import type { PostWithCreator, WatchlistItem } from '../../types/database';

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

/** Optional context passed via router state when navigating from a real per-user record
 * (e.g. a Watching-tab item) — the route itself never depends on this being present. */
interface AssetNavState {
  assetName?: string;
  assetType?: WatchlistItem['asset_type'];
}

/** Polygon's reference `type` codes, mapped to short display labels. Defaults to the raw
 * code for anything not covered — better an unfamiliar-but-real code than a guessed label. */
const ASSET_TYPE_LABELS: Record<string, string> = {
  CS: 'Stock',
  ETF: 'ETF',
  ETN: 'ETN',
  ETS: 'ETF',
  ADRC: 'Stock',
  ADRP: 'Stock',
  ADRR: 'Stock',
  UNIT: 'Unit',
  PFD: 'Preferred',
  RIGHT: 'Right',
  WARRANT: 'Warrant',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────
// Dedicated single-asset page keyed only by the :symbol route param, so direct navigation and
// browser refresh always work with no dependency on how the user arrived here. Every section
// (price, chart, creator activity) fails independently into its own "unavailable" state rather
// than blocking the rest of the page or fabricating a number to fill the gap — there is no
// canonical asset registry in this app today, so a ticker's price/chart is only ever genuine
// live market data (via market.service.ts, itself gated on a configured API key) or explicitly
// absent, never a guess.
export default function AssetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { symbol = '' } = useParams<{ symbol: string }>();
  const ticker = symbol.toUpperCase();
  const navState = (location.state ?? null) as AssetNavState | null;

  const [metadata, setMetadata] = useState<TickerSearchResult | null>(null);
  const [tickerInfo, setTickerInfo] = useState<LiveTickerInfo | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [chartData, setChartData] = useState<{ time: string; value: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const liveData = hasLiveMarketData();

  const [posts, setPosts] = useState<PostWithCreator[] | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    // Independent of navState — a direct URL or refresh must show the real company name too,
    // not just whatever a Watching-tab click happened to pass through router state.
    setMetadata(null);
    getTickerMetadata(ticker).then(setMetadata);
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    setPriceLoading(true);
    getTickerInfo(ticker).then(info => {
      setTickerInfo(info);
      setPriceLoading(false);
    });
  }, [ticker]);

  useEffect(() => {
    if (!ticker || !liveData) {
      setChartData([]);
      setChartLoading(false);
      return;
    }
    setChartLoading(true);
    getLiveTickerChart(ticker, timeRange).then(data => {
      setChartData(data ?? []);
      setChartLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeRange, liveData]);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setPostsLoading(true);
    getPostsByTicker(ticker, 5).then(({ data, error }) => {
      if (cancelled) return;
      setPostsLoading(false);
      if (error) {
        reportServiceError(error, { label: `activity for $${ticker}` });
        return;
      }
      setPosts(data ?? []);
    });
    return () => { cancelled = true; };
  }, [ticker]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black mb-6">
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back
          </button>

          {/* ── Header ── */}
          {(() => {
            // Real provider metadata (works on direct nav/refresh) takes priority; the
            // Watching-tab nav-state hint only fills in while that fetch is in flight or if
            // the provider doesn't recognize this symbol.
            const displayType = ASSET_TYPE_LABELS[metadata?.type ?? ''] ?? metadata?.type ?? navState?.assetType ?? null;
            const displayName = (metadata?.name && metadata.name !== ticker) ? metadata.name
              : (navState?.assetName && navState.assetName !== ticker) ? navState.assetName
              : null;
            return (
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold font-mono break-all">{ticker}</h1>
                    {displayType && (
                      <Badge variant="outline" className="border-transparent px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 font-medium flex-shrink-0">
                        {displayType}
                      </Badge>
                    )}
                  </div>
                  <p className="text-neutral-600 mt-1 break-words">
                    {displayName ?? 'Asset details'}
                  </p>
                </div>

            {priceLoading ? (
              <div className="text-right animate-pulse space-y-2">
                <div className="h-7 w-24 bg-neutral-200 rounded ml-auto" />
                <div className="h-4 w-16 bg-neutral-200 rounded ml-auto" />
              </div>
            ) : tickerInfo ? (
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold">{tickerInfo.price}</p>
                <p className={`text-sm font-medium ${tickerInfo.positive ? 'text-brand' : 'text-red-500'}`}>
                  {tickerInfo.changeAmt} ({tickerInfo.change})
                </p>
              </div>
            ) : null}
              </div>
            );
          })()}

          {!priceLoading && !tickerInfo && (
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center mb-6">
              <p className="text-sm text-neutral-500">Live price data is not available for {ticker} right now.</p>
            </div>
          )}

          {/* ── Chart ── */}
          {liveData && (
            <div className="mb-8">
              <h2 className="text-base font-semibold mb-3">Price Chart</h2>
              <div className="bg-neutral-50 rounded-lg p-4 w-full">
                {chartLoading ? (
                  <div className="h-48 min-h-[192px] w-full animate-pulse bg-neutral-100 rounded" />
                ) : chartData.length > 0 ? (
                  <div className="h-48 min-h-[192px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height={192} minHeight={192}>
                      <LineChart data={chartData}>
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Price')} labelFormatter={showChartLabel} />
                        <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center">
                    <p className="text-sm text-neutral-500">Chart data is not available for {ticker} right now.</p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-3 mt-3 text-xs font-medium flex-wrap">
                  {TIME_RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        timeRange === r ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:bg-white hover:text-black'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!liveData && (
            <div className="p-6 bg-neutral-50 rounded-lg border border-neutral-200 text-center mb-8">
              <p className="text-sm text-neutral-500">Live market data isn't connected in this environment.</p>
            </div>
          )}

          {/* ── Creator Activity ── */}
          <div>
            <h2 className="text-base font-semibold mb-3">Creator Activity</h2>
            {postsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map(n => <div key={n} className="h-20 bg-neutral-100 rounded-xl" />)}
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => navigate(`/profile/${post.creator.username}/investment`)}
                    className="w-full flex items-start gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {(post.creator.full_name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{post.creator.full_name}</span>
                        {isCreatorVerified(post.creator) && <VerifiedBadge size={14} />}
                        <span className="text-xs text-neutral-400">· {timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-neutral-700 line-clamp-2 mt-0.5">{post.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
                <p className="text-sm text-neutral-500">No creator activity tagged with ${ticker} yet.</p>
              </div>
            )}
          </div>

          <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl mt-8">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Disclaimer:</strong> Content shown here is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
