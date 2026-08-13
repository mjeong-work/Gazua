import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import RefreshIcon from '@mui/icons-material/Refresh';
import Footer from './Footer';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AppHeader from './AppHeader';
import AIDisclaimerCard from './compliance/AIDisclaimerCard';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { getUserActivity } from '../data/userActivity';
import { generateInsights, type InvestmentInsights } from '../services/claudeInsights';

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; insights: InvestmentInsights; generatedAt: Date }
  | { status: 'error'; message: string };

const SEGMENT_COLORS = ['var(--brand)', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444'];

function StyleBar({ breakdown }: { breakdown: InvestmentInsights['styleBreakdown'] }) {
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-5 mb-4">
        {breakdown.map((seg, i) => (
          <div
            key={seg.label}
            style={{
              width: `${seg.percentage}%`,
              backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }}
            title={`${seg.label}: ${seg.percentage}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {breakdown.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            />
            <span className="text-neutral-700 font-medium">{seg.label}</span>
            <span className="text-neutral-400">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  const pulse = 'animate-pulse bg-neutral-100 rounded';
  return (
    <div className="space-y-8">
      {/* Personality skeleton */}
      <div className="border border-neutral-200 rounded-md p-8 space-y-4">
        <div className={`${pulse} h-8 w-2/3`} />
        <div className={`${pulse} h-4 w-full`} />
        <div className={`${pulse} h-4 w-5/6`} />
        <div className="flex gap-2 pt-2">
          {[1, 2, 3].map(i => <div key={i} className={`${pulse} h-7 w-36 rounded-full`} />)}
        </div>
      </div>
      {/* Style bar skeleton */}
      <div className="border border-neutral-200 rounded-md p-8 space-y-4">
        <div className={`${pulse} h-6 w-40`} />
        <div className={`${pulse} h-5 w-full rounded-full`} />
        <div className="flex gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className={`${pulse} h-4 w-24`} />)}
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className={`${pulse} h-36 rounded-md`} />)}
      </div>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border border-neutral-200 rounded-md p-10 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AutoAwesomeIcon sx={{ fontSize: 32, color: 'var(--icon-muted)' }} />
      </div>
      <h3 className="text-xl font-semibold mb-2">Analysis temporarily unavailable</h3>
      <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
        We couldn't generate your profile right now. Your data is safe — try again in a moment.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

function PersonalityCard({ personality }: { personality: InvestmentInsights['personality'] }) {
  return (
    <div className="border border-neutral-200 rounded-md p-8">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 bg-mint rounded-full flex items-center justify-center flex-shrink-0">
          <AutoAwesomeIcon sx={{ fontSize: 22, color: '#000' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">{personality.title}</h2>
          <p className="text-neutral-600 leading-relaxed">{personality.summary}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
        {personality.traits.map(trait => (
          <span
            key={trait}
            className="px-3 py-1.5 bg-mint/15 text-brand text-sm font-medium rounded-sm border border-mint/30"
          >
            {trait}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendingCard({ asset }: { asset: InvestmentInsights['trendingAssets'][number] }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/asset/${asset.ticker}`)}
      className="w-full text-left border border-neutral-200 rounded-md p-5 hover:border-neutral-300 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg font-bold font-mono">{asset.ticker}</span>
      </div>
      <p className="text-sm text-neutral-600 leading-relaxed">{asset.context}</p>
    </button>
  );
}

const TYPE_LABEL: Record<string, string> = {
  creator: 'Creator',
  post: 'Post',
  model: 'Model',
};

function RecommendationCard({ rec }: { rec: InvestmentInsights['recommendations'][number] }) {
  return (
    <div className="border border-neutral-200 rounded-md p-5 hover:border-neutral-300 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded">
          {TYPE_LABEL[rec.type] ?? rec.type}
        </span>
      </div>
      <p className="font-semibold text-sm mb-1 line-clamp-2">{rec.title}</p>
      <p className="text-xs text-neutral-500 mb-2">{rec.creator}</p>
      <p className="text-xs text-brand leading-relaxed">{rec.reason}</p>
    </div>
  );
}

export default function InvestmentProfilePage() {
  const navigate = useNavigate();
  const { watchlistItems } = useWatchlist();
  const { data: onboardingData } = useOnboarding();
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  const hasMounted = useRef(false);

  const hasActivity =
    watchlistItems.length > 0 ||
    onboardingData.level !== null ||
    onboardingData.interests.length > 0;

  const runAnalysis = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const activity = await getUserActivity(undefined, {
        liveWatchlist: watchlistItems,
        level: onboardingData.level,
        interests: onboardingData.interests,
        riskStyle: onboardingData.riskStyle,
      });
      const insights = await generateInsights(activity);
      setState({ status: 'success', insights, generatedAt: new Date() });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed. Please try again.',
      });
    }
  }, [watchlistItems, onboardingData]);

  // Run once when activity first becomes available (watchlist/onboarding may load async).
  // The Refresh button handles manual re-runs.
  useEffect(() => {
    if (!hasMounted.current && hasActivity) {
      hasMounted.current = true;
      runAnalysis();
    }
  }, [hasActivity, runAnalysis]);

  const isLoading = state.status === 'loading' || state.status === 'idle';
  const generatedAt = state.status === 'success' ? state.generatedAt : null;

  if (!hasActivity) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              📊
            </div>
            <h2 className="text-2xl font-bold mb-3">Your profile builds as you explore</h2>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Complete onboarding, save posts to your watchlist, and follow creators
              to unlock your personalized investment profile.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => navigate('/main')}
                className="px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
              >
                Explore the Feed
              </button>
              <button
                onClick={() => navigate('/creators')}
                className="px-6 py-3 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Discover Creators
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-3">My Investment Profile</h1>
                <p className="text-neutral-600 text-lg">
                  Patterns in what you've read, saved, and watched — for educational context only.
                </p>
                {generatedAt && (
                  <p className="text-xs text-neutral-400 mt-2">
                    Last updated {generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button
                onClick={runAnalysis}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-6"
              >
                <RefreshIcon sx={{ fontSize: 16 }} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Analyzing…' : 'Refresh Analysis'}
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading && <LoadingSkeleton />}

          {state.status === 'error' && (
            <ErrorCard onRetry={runAnalysis} />
          )}

          {state.status === 'success' && (
            <div className="space-y-8">
              <AIDisclaimerCard />

              {/* Section 1 — Personality */}
              <PersonalityCard personality={state.insights.personality} />

              {/* Section 2 — Style Breakdown */}
              <div className="border border-neutral-200 rounded-md p-8">
                <h2 className="text-xl font-bold mb-6">Your Engagement Style</h2>
                <StyleBar breakdown={state.insights.styleBreakdown} />
              </div>

              {/* Sections 3 + 4 side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Trending in Your Style</h2>
                  <div className="space-y-3">
                    {state.insights.trendingAssets.map(asset => (
                      <TrendingCard key={asset.ticker} asset={asset} />
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-4">Recommended for You</h2>
                  <div className="space-y-3">
                    {state.insights.recommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} />
                    ))}
                  </div>
                </div>
              </div>

              <Footer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
