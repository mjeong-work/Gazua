/**
 * adminStats.service.ts
 *
 * Dashboard statistics: user counts + growth metrics bucketed by day/week/
 * month. Growth bucketing happens client-side (date-fns, already a
 * dependency) over a bounded `profiles.created_at` fetch, mirroring the
 * `{'1W':7,'1M':30,...,'ALL':400}`-style range convention already used in
 * MyProfilePage.tsx — no new Postgres bucketing function, keeping the
 * migration minimal.
 */

import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns'
import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { GrowthBucket, GrowthPoint, UserStats } from '../../types/admin'

// ── getUserStats ─────────────────────────────────────────────────
export async function getUserStats(): Promise<ServiceResult<UserStats>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, newRes, suspendedRes, creatorsRes, activeRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_creator', true),
    getActiveUserCount(thirtyDaysAgo),
  ])

  if (totalRes.error) return { data: null, error: totalRes.error.message }
  if (newRes.error) return { data: null, error: newRes.error.message }
  if (suspendedRes.error) return { data: null, error: suspendedRes.error.message }
  if (creatorsRes.error) return { data: null, error: creatorsRes.error.message }

  return {
    data: {
      totalUsers: totalRes.count ?? 0,
      newUsersLast30d: newRes.count ?? 0,
      activeUsersLast30d: activeRes,
      suspendedUsers: suspendedRes.count ?? 0,
      creators: creatorsRes.count ?? 0,
    },
    error: null,
  }
}

// Approximation of "active" — distinct authors of recent posts/reels/comments, since
// true login-session activity (auth.users.last_sign_in_at) requires the service_role
// key, which correctly never ships to this browser SPA. Documented in types/admin.ts.
async function getActiveUserCount(sinceIso: string): Promise<number> {
  const [posts, reels, comments] = await Promise.all([
    supabase.from('posts').select('creator_id').gte('created_at', sinceIso).limit(2000),
    supabase.from('reels').select('creator_id').gte('created_at', sinceIso).limit(2000),
    supabase.from('post_comments').select('user_id').gte('created_at', sinceIso).limit(2000),
  ])

  const ids = new Set<string>()
  for (const row of posts.data ?? []) ids.add((row as { creator_id: string }).creator_id)
  for (const row of reels.data ?? []) ids.add((row as { creator_id: string }).creator_id)
  for (const row of comments.data ?? []) ids.add((row as { user_id: string }).user_id)
  return ids.size
}

// ── getGrowthMetrics ─────────────────────────────────────────────
export async function getGrowthMetrics(
  bucket: GrowthBucket,
  sinceDays = 180
): Promise<ServiceResult<GrowthPoint[]>> {
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .select('created_at, is_creator')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(5000)

  if (error) return { data: null, error: error.message }

  const bucketStart = bucket === 'day' ? startOfDay : bucket === 'week' ? startOfWeek : startOfMonth
  const labelFormat = bucket === 'day' ? 'MMM d' : bucket === 'week' ? 'MMM d' : 'MMM yyyy'

  const buckets = new Map<string, GrowthPoint>()
  for (const row of (data ?? []) as { created_at: string; is_creator: boolean }[]) {
    const key = format(bucketStart(new Date(row.created_at)), labelFormat)
    const point = buckets.get(key) ?? { bucket: key, newUsers: 0, newCreators: 0 }
    point.newUsers += 1
    if (row.is_creator) point.newCreators += 1
    buckets.set(key, point)
  }

  return { data: [...buckets.values()], error: null }
}
