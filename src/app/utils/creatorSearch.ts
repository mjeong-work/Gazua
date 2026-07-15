import { getCreator, nameToCreatorId, type CreatorCard } from '../data/creators';
import { MOCK_REELS } from '../data/reels';

/**
 * Small ticker -> company-name map for company-name search (e.g. "NVIDIA" should match $NVDA).
 * Deliberately a local, minimal copy rather than importing SearchModal.tsx's own list (which
 * uses full legal names like "Nvidia Corporation" for display) — this keeps the two features
 * decoupled so neither can regress the other, and lets this list use the short form people
 * actually type. Extend as needed; this is the seam a future backend search would replace.
 */
const TICKER_COMPANY_NAMES: Record<string, string> = {
  NVDA: 'Nvidia',
  TSLA: 'Tesla',
  SPY: 'S&P 500',
  QQQ: 'Nasdaq 100',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
};

/** True if `query` is an exact match, or a partial/substring match, against a ticker this set
 * contains or its mapped company name. */
function tickerSetHasExact(tickers: Set<string>, queryUpper: string, query: string): boolean {
  return tickers.has(queryUpper) || [...tickers].some((t) => TICKER_COMPANY_NAMES[t]?.toLowerCase() === query);
}
function tickerSetHasPartial(tickers: Set<string>, query: string): boolean {
  return [...tickers].some(
    (t) => t.toLowerCase().includes(query) || (TICKER_COMPANY_NAMES[t]?.toLowerCase().includes(query) ?? false),
  );
}

export interface SearchableContent {
  title: string;
  creatorName: string;
}

interface CreatorMatchIndex {
  slug: string;
  card: CreatorCard;
  handle: string;
  bio: string;
  tickers: Set<string>;
  captionText: string;
}

/** One-time per-search index: resolves each creator's profile/handle/bio and cross-references
 * MOCK_REELS (keyed by the same creator-slug convention already used across this codebase) to
 * find which tickers/captions each creator is actually associated with — CreatorCard itself
 * has no ticker field, so this is the only real (non-fabricated) source of that signal. */
function buildCreatorIndex(creators: CreatorCard[]): CreatorMatchIndex[] {
  return creators.map((card) => {
    const slug = nameToCreatorId(card.name);
    const profile = getCreator(slug);
    const creatorReels = MOCK_REELS.filter((r) => r.creator_id === slug);
    return {
      slug,
      card,
      handle: (profile?.handle ?? '').replace(/^@/, '').toLowerCase(),
      bio: (profile?.bio ?? '').toLowerCase(),
      tickers: new Set(creatorReels.flatMap((r) => r.tickers.map((t) => t.toUpperCase()))),
      captionText: creatorReels.map((r) => r.caption).join(' ').toLowerCase(),
    };
  });
}

/**
 * Match tier per the required result priority — lower number ranks higher.
 * 1 = exact creator name/username match
 * 2 = exact ticker or company match (creator is actually associated with that ticker)
 * 3 = partial creator match (name, handle, tagline, focus)
 * 4 = related content/caption/tag/bio match (including partial ticker/company mentions)
 */
function matchTier(entry: CreatorMatchIndex, query: string, queryUpper: string): 1 | 2 | 3 | 4 | null {
  const { card, handle, bio, tickers, captionText } = entry;
  const name = card.name.toLowerCase();

  if (name === query || (handle && handle === query)) return 1;

  if (tickerSetHasExact(tickers, queryUpper, query)) return 2;

  if (
    name.includes(query) ||
    (handle && handle.includes(query)) ||
    card.tagline.toLowerCase().includes(query) ||
    card.focus.toLowerCase().includes(query)
  ) {
    return 3;
  }

  if (
    card.tags.some((t) => t.toLowerCase().includes(query)) ||
    bio.includes(query) ||
    captionText.includes(query) ||
    tickerSetHasPartial(tickers, query)
  ) {
    return 4;
  }

  return null;
}

export function searchCreators(creators: CreatorCard[], rawQuery: string): CreatorCard[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return creators;
  const queryUpper = rawQuery.trim().toUpperCase();

  const index = buildCreatorIndex(creators);
  const scored = index
    .map((entry) => ({ entry, tier: matchTier(entry, query, queryUpper) }))
    .filter((r): r is { entry: CreatorMatchIndex; tier: 1 | 2 | 3 | 4 } => r.tier !== null);

  scored.sort((a, b) => a.tier - b.tier);
  return scored.map((r) => r.entry.card);
}

/**
 * For content/video grids, which only carry a title and a creator display name (no tags,
 * captions, or tickers of their own) — matches on title, the creator's own name/handle, or a
 * ticker/company the creator is known to discuss (same MOCK_REELS cross-reference as above).
 * Simpler pass/fail than the 4-tier creator ranking since these items don't have distinct
 * enough fields to warrant separate tiers; original curated order is preserved among matches.
 */
export function matchesCreatorSearch<T extends SearchableContent>(item: T, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const queryUpper = rawQuery.trim().toUpperCase();

  if (item.title.toLowerCase().includes(query) || item.creatorName.toLowerCase().includes(query)) {
    return true;
  }

  const slug = nameToCreatorId(item.creatorName);
  const profile = getCreator(slug);
  if (profile?.handle?.replace(/^@/, '').toLowerCase().includes(query)) return true;

  const creatorReels = MOCK_REELS.filter((r) => r.creator_id === slug);
  const tickers = new Set(creatorReels.flatMap((r) => r.tickers.map((t) => t.toUpperCase())));
  return tickerSetHasExact(tickers, queryUpper, query) || tickerSetHasPartial(tickers, query);
}
