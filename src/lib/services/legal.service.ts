/**
 * legal.service.ts
 *
 * Provides:
 *  - recordLegalAcceptance() — persists a versioned acceptance record to
 *    user_legal_acceptances (fire-and-forget, same convention as logAuditEvent)
 *
 * 'user_legal_acceptances' is not yet in database.ts (added by
 * supabase/migrations/20260708000000_legal_acceptances.sql) — use `as never`
 * to bypass the generated type until `supabase gen types` is re-run.
 */

import { supabase, getCurrentUserId } from '../supabase'

export async function recordLegalAcceptance(params: {
  documentSlug: string
  documentVersion: string
  jurisdiction?: string
  locale?: string
}): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  await (supabase as never as {
    from: (t: string) => { insert: (r: object) => Promise<unknown> }
  }).from('user_legal_acceptances').insert({
    user_id: userId,
    document_slug: params.documentSlug,
    document_version: params.documentVersion,
    jurisdiction: params.jurisdiction ?? 'US',
    locale: params.locale ?? 'en',
  })
}
