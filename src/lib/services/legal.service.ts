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
import { getLatestDocument } from '../legal/registry'
import { logAuditEvent } from './compliance.service'

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

/**
 * True if this user already has a user_legal_acceptances row for the current (latest)
 * version of both 'terms' and 'privacy'. Used to avoid re-recording (and re-writing
 * profiles.terms_accepted_at) on every repeat login — only a genuinely new or
 * out-of-date acceptance should insert a new row.
 */
export async function hasCurrentLegalAcceptance(userId: string): Promise<boolean> {
  const terms = getLatestDocument('terms')
  const privacy = getLatestDocument('privacy')
  if (!terms || !privacy) return true // nothing to check against — don't block on missing content

  const { data } = await (supabase as never as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          in: (col: string, vals: string[]) => Promise<{ data: { document_slug: string; document_version: string }[] | null }>
        }
      }
    }
  }).from('user_legal_acceptances').select('document_slug, document_version').eq('user_id', userId).in('document_slug', ['terms', 'privacy'])

  const rows = data ?? []
  const hasTerms = rows.some((r) => r.document_slug === 'terms' && r.document_version === terms.version)
  const hasPrivacy = rows.some((r) => r.document_slug === 'privacy' && r.document_version === privacy.version)
  return hasTerms && hasPrivacy
}

/**
 * Single source of truth for "this user has acknowledged our terms" — shared by the
 * email/password signup flow (SignUp.tsx, called immediately since a session is already in
 * hand) and the OAuth callback (AuthCallback.tsx, called after the redirect completes, only
 * for a signup-intent Google sign-in — see auth.service.ts's signInWithGoogle). Records the
 * same three things either way: profiles.terms_accepted_at (legacy column other code reads),
 * versioned user_legal_acceptances rows for terms + privacy, and a compliance_audit_logs entry.
 * Skips re-recording if a current-version acceptance already exists, so a returning OAuth
 * login never creates duplicate rows.
 */
export async function recordLegalAcknowledgement(userId: string, metadata: Record<string, unknown> = {}): Promise<void> {
  if (await hasCurrentLegalAcceptance(userId)) return

  await (supabase as never as {
    from: (t: string) => { update: (r: object) => { eq: (col: string, val: string) => Promise<unknown> } }
  }).from('profiles').update({ terms_accepted_at: new Date().toISOString() }).eq('id', userId)

  const terms = getLatestDocument('terms')
  const privacy = getLatestDocument('privacy')
  if (terms) await recordLegalAcceptance({ documentSlug: 'terms', documentVersion: terms.version }).catch(() => {})
  if (privacy) await recordLegalAcceptance({ documentSlug: 'privacy', documentVersion: privacy.version }).catch(() => {})

  await logAuditEvent({ eventType: 'onboarding_acknowledgement_accepted', metadata }).catch(() => {})
}
