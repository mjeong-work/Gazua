import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Profile, ProfileUpdate, FeaturedCategory } from '../../types/database'

// ── Creator snippet columns used in list views ───────────────────
// credibility_level, portfolio_allocation, and creator_risk_style were missing here even
// though CreatorProfileInvestment.tsx/CreatorProfileVideos.tsx (via getCreatorByUsername,
// below) read all three off the result — Supabase silently omits unselected columns from the
// response rather than erroring, so those pages' verified badge and portfolio/risk display
// were reading undefined and always falling back to their "not set" branch, regardless of the
// real DB value. getProfile()'s `select('*')` (used for the signed-in user's own profile via
// AuthContext) never had this gap, which is how it went unnoticed — only the *public* view of
// someone else's profile was affected.
const CREATOR_LIST_COLUMNS = `
  id, username, handle, full_name, avatar_url, bio,
  focus, tagline, tags, is_verified, is_creator, featured_category,
  credibility_level, portfolio_allocation, creator_risk_style,
  subscription_tier, onboarding_completed, created_at
` as const

// ── getProfile ───────────────────────────────────────────────────
/** Fetch a single profile by UUID. Used for the authenticated user's own profile. */
export async function getProfile(userId: string): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── getCreatorByUsername ─────────────────────────────────────────
/**
 * Fetch a profile by its URL slug (username). Used on profile pages —
 * both a creator's public profile and a regular user's own profile
 * (e.g. the /watchlist -> /profile/:username/investment redirect), so
 * this intentionally does not filter on is_creator.
 */
export async function getCreatorByUsername(username: string): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(CREATOR_LIST_COLUMNS)
    .eq('username', username)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── getCreators ──────────────────────────────────────────────────
/**
 * Fetch the creator discovery list.
 * Pass `featuredCategory` to get a specific section (e.g. 'trending').
 * Pass no arguments to get all creators ordered by follower count proxy (created_at for now).
 */
export async function getCreators(options?: {
  featuredCategory?: FeaturedCategory
  tags?: string[]
  limit?: number
}): Promise<ServiceResult<Profile[]>> {
  let query = supabase
    .from('profiles')
    .select(CREATOR_LIST_COLUMNS)
    .eq('is_creator', true)

  if (options?.featuredCategory) {
    query = query.eq('featured_category', options.featuredCategory)
  }

  if (options?.tags && options.tags.length > 0) {
    // Postgres array overlap: profiles whose tags array contains ANY of the given tags
    query = query.overlaps('tags', options.tags)
  }

  query = query
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── searchCreators ───────────────────────────────────────────────
/** Full-text search on creator name and username. Used by SearchModal. */
export async function searchCreators(
  query: string,
  limit = 7
): Promise<ServiceResult<Profile[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(CREATOR_LIST_COLUMNS)
    .eq('is_creator', true)
    .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,handle.ilike.%${query}%`)
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── updateProfile ────────────────────────────────────────────────
/** Update the authenticated user's own profile. RLS enforces ownership. */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── updateOnboarding ─────────────────────────────────────────────
/**
 * Persists onboarding choices to the profiles table.
 * Replaces the localStorage write in OnboardingContext.
 */
export async function updateOnboarding(
  userId: string,
  payload: {
    onboarding_level?: Profile['onboarding_level']
    onboarding_interests?: string[]
    onboarding_risk_style?: Profile['onboarding_risk_style']
    onboarding_completed?: boolean
  }
): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── getFollowerCount ─────────────────────────────────────────────
/** Returns the number of users who follow a given creator. */
export async function getFollowerCount(creatorId: string): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}
