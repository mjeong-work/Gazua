import { supabase } from './supabase'
import type { ServiceResult } from './supabase'

// ── Buckets ──────────────────────────────────────────────────────
// All public-read; RLS requires authenticated inserts and scopes deletes to the
// uploader (the file path's first segment must equal auth.uid()) — see buildOwnerPath.
export const BUCKETS = {
  avatars: (import.meta.env.VITE_STORAGE_BUCKET_AVATARS as string | undefined) ?? 'avatars',
  videos: (import.meta.env.VITE_STORAGE_BUCKET_VIDEOS as string | undefined) ?? 'videos',
  reels: (import.meta.env.VITE_STORAGE_BUCKET_REELS as string | undefined) ?? 'reels',
  models: (import.meta.env.VITE_STORAGE_BUCKET_MODELS as string | undefined) ?? 'models',
  thumbnails: (import.meta.env.VITE_STORAGE_BUCKET_THUMBNAILS as string | undefined) ?? 'thumbnails',
} as const

// ── buildOwnerPath ───────────────────────────────────────────────
/** Storage path convention required by the owner-delete RLS policy: `{userId}/{uuid}.{ext}`. */
export function buildOwnerPath(userId: string, ext: string): string {
  return `${userId}/${crypto.randomUUID()}.${ext}`
}

// ── uploadToBucket ───────────────────────────────────────────────
/** Uploads a file/blob to a public bucket and returns its storage path + public URL. */
export async function uploadToBucket(
  bucket: string,
  path: string,
  file: File | Blob
): Promise<ServiceResult<{ path: string; publicUrl: string }>> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) return { data: null, error: error.message }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { data: { path, publicUrl: data.publicUrl }, error: null }
}

// ── getPublicUrl ─────────────────────────────────────────────────
/** Derives a public playback URL from a persisted storage_path. No network call. */
export function getPublicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
