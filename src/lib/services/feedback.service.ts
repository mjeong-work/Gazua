/**
 * feedback.service.ts
 *
 * User-facing side of the in-app feedback channel — the submit call behind
 * FeedbackModal. Admin-facing triage (list/update status) lives in
 * adminFeedback.service.ts, mirroring the compliance.service.ts /
 * adminReports.service.ts split.
 */

import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'

// ── submitFeedback ───────────────────────────────────────────────
export async function submitFeedback(
  userId: string,
  message: string,
  pageUrl?: string,
): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    message: message.trim(),
    page_url: pageUrl ?? null,
  })

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
