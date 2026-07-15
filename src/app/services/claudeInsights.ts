import type { UserActivity } from '../data/userActivity'

export interface InvestmentInsights {
  personality: {
    title: string
    summary: string
    traits: string[]
  }
  trendingAssets: Array<{
    ticker: string
    context: string
  }>
  recommendations: Array<{
    type: 'creator' | 'post' | 'model'
    title: string
    creator: string
    reason: string
  }>
  styleBreakdown: Array<{
    label: string
    percentage: number
  }>
}

// Shown when the Edge Function is unavailable or Supabase env vars are missing.
export const MOCK_INSIGHTS: InvestmentInsights = {
  personality: {
    title: 'Diversified long-term learner',
    summary:
      "You seem drawn to understanding the full investing picture — your watchlist spans stocks, ETFs, and crypto, which suggests you're building a broad mental model before committing to a lane. The mix of growth-oriented creators you follow alongside passive-index content points to someone weighing strategies rather than chasing a single approach.",
    traits: [
      'Balances growth and passive index content',
      'Multi-asset watchlist with clear thesis notes',
      'Engages with both beginner and advanced material',
      'Saves models for deeper research later',
    ],
  },
  trendingAssets: [
    { ticker: 'NVDA', context: 'Your most-noted holding, linked to AI infrastructure thesis' },
    { ticker: 'SPY',  context: 'Appears alongside your passive-index engagement pattern' },
    { ticker: 'BTC',  context: 'In your watchlist with a long-term store-of-value framing' },
    { ticker: 'AAPL', context: 'Marked "Ready to Act" — highest conviction item you track' },
  ],
  recommendations: [
    {
      type: 'post',
      title: 'Why I Pair Index Funds with Individual Stock Conviction',
      creator: 'David Park',
      reason: 'Matches your dual passive + growth engagement pattern',
    },
    {
      type: 'model',
      title: 'Portfolio Beta & Volatility Calculator',
      creator: 'Emma Wilson',
      reason: 'Useful for the multi-asset watchlist you are building',
    },
    {
      type: 'creator',
      title: 'Mike Ross — Quant & Model Builders',
      creator: 'Mike Ross',
      reason: 'Your saved models suggest appetite for systematic approaches',
    },
    {
      type: 'post',
      title: 'DCF Valuation: What the Numbers Actually Mean',
      creator: 'Sarah Chen',
      reason: 'Complements your AAPL thesis-building activity',
    },
  ],
  styleBreakdown: [
    { label: 'ETFs & Index',   percentage: 35 },
    { label: 'Growth Stocks',  percentage: 28 },
    { label: 'Crypto',         percentage: 17 },
    { label: 'Quant & Models', percentage: 12 },
    { label: 'Retirement',     percentage: 8  },
  ],
}

/**
 * Calls the Supabase Edge Function which holds ANTHROPIC_API_KEY server-side.
 * Falls back to MOCK_INSIGHTS silently on any failure so the page always renders.
 * The function signature is identical to the old direct-SDK version — callers unchanged.
 */
export async function generateInsights(activity: UserActivity): Promise<InvestmentInsights> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!supabaseUrl || !anonKey) {
    console.warn('[claudeInsights] Supabase env vars not set — using mock insights.')
    return MOCK_INSIGHTS
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/claude-insights`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ userActivity: activity }),
    })

    if (!res.ok) {
      throw new Error(`Edge Function responded with HTTP ${res.status}`)
    }

    const payload = await res.json() as { insights?: InvestmentInsights; error?: string }

    if (payload.error) throw new Error(payload.error)
    if (!payload.insights) throw new Error('Edge Function returned no insights.')

    return payload.insights
  } catch (err) {
    console.warn('[claudeInsights] Edge Function call failed — using mock insights.', err)
    return MOCK_INSIGHTS
  }
}
