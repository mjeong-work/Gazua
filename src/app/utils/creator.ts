import type { CredibilityLevel, Json, Profile, AllocationSlice } from '../../types/database';

/**
 * Single source of truth for the public "verified creator" badge — credibility_level ===
 * 'verified_pro' only. is_verified is a separate internal due-diligence flag and must never
 * drive this badge (see 20260805000000_credibility_level.sql). Accepts anything with a
 * credibility_level field so it works against Profile, CreatorSnippet, and VideoWithCreator's
 * embedded creator alike.
 */
export function isCreatorVerified(entity: { credibility_level: CredibilityLevel } | null | undefined): boolean {
  return entity?.credibility_level === 'verified_pro';
}

export const RISK_STYLE_LABELS: Record<NonNullable<Profile['creator_risk_style']>, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
  speculative: 'Speculative',
};

/** Sum of an allocation's slice values. Used to validate the "must equal 100" invariant client-side. */
export function allocationTotal(slices: AllocationSlice[]): number {
  return slices.reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);
}

/**
 * True if every slice has a non-empty name and a positive numeric value, and the total is
 * exactly 100 — mirrors the DB's validate_portfolio_allocation() constraint (see
 * 20260805010000_portfolio_allocation_validation.sql) so invalid saves are caught client-side
 * before hitting the DB round trip. An empty slice list is invalid here (use null to clear).
 */
export function isAllocationValid(slices: AllocationSlice[]): boolean {
  if (slices.length === 0) return false;
  if (slices.some(s => !s.name.trim() || !Number.isFinite(s.value) || s.value <= 0)) return false;
  return allocationTotal(slices) === 100;
}

/**
 * Parses profiles.portfolio_allocation (raw Json from Supabase) into AllocationSlice[],
 * tolerating malformed entries rather than throwing — same defensive shape-checking
 * CreatorProfileInvestment.tsx already does when rendering it. Returns [] for null/empty/
 * malformed input so callers can treat "[]" as the edit form's starting point uniformly.
 */
export function parseAllocation(raw: Json | null | undefined): AllocationSlice[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((slice): AllocationSlice => {
    const s = (slice ?? {}) as { name?: unknown; value?: unknown };
    return { name: typeof s.name === 'string' ? s.name : '', value: typeof s.value === 'number' ? s.value : 0 };
  });
}

/** Casts a validated AllocationSlice[] (or null, to clear) for the profiles.portfolio_allocation Json column. */
export function allocationToJson(slices: AllocationSlice[] | null): Json {
  return slices as unknown as Json;
}
