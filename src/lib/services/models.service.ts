import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Model, ModelInsert, ModelWithCreator } from '../../types/database'

const MODEL_WITH_CREATOR = `
  *,
  creator:profiles!creator_id(id, username, full_name, avatar_url)
` as const

// ── getModelsByCreatorId ─────────────────────────────────────────
/** Fetch models for a creator by their UUID. */
export async function getModelsByCreatorId(
  creatorId: string,
  limit = 30
): Promise<ServiceResult<ModelWithCreator[]>> {
  const { data, error } = await supabase
    .from('models')
    .select(MODEL_WITH_CREATOR)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as ModelWithCreator[], error: null }
}

// ── getModelsByCreatorUsername ───────────────────────────────────
/**
 * Fetch models for a creator by their username slug.
 * Used from profile pages where the URL param is a username, not a UUID.
 * Resolves the UUID via a profiles lookup, then queries models.
 */
export async function getModelsByCreatorUsername(
  username: string,
  limit = 30
): Promise<ServiceResult<ModelWithCreator[]>> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (profileError || !profile) {
    return { data: null, error: profileError?.message ?? 'Creator not found' }
  }
  return getModelsByCreatorId(profile.id, limit)
}

// ── getModels ────────────────────────────────────────────────────
/** All models for the ModelHub page, ordered by download count. */
export async function getModels(options?: {
  category?: string
  accessLevel?: string
  limit?: number
}): Promise<ServiceResult<ModelWithCreator[]>> {
  let query = supabase
    .from('models')
    .select(MODEL_WITH_CREATOR)
    .order('download_count', { ascending: false })
    .limit(options?.limit ?? 20)

  if (options?.category)    query = query.eq('category', options.category)
  if (options?.accessLevel) query = query.eq('access_level', options.accessLevel)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as unknown as ModelWithCreator[], error: null }
}

// ── createModel ──────────────────────────────────────────────────
export async function createModel(
  payload: Omit<ModelInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResult<Model>> {
  const { data, error } = await supabase
    .from('models')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── incrementDownloadCount ───────────────────────────────────────
/** Atomically increment download_count when a user downloads a model. */
export async function incrementDownloadCount(modelId: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.rpc('increment_model_downloads', { model_id: modelId })
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
