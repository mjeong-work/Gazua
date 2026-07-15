/**
 * compliance.service.ts
 *
 * Provides:
 *  - screenContent()      — synchronous, regex-based risk scoring (no LLM needed)
 *  - saveComplianceReview() — persists audit record to compliance_reviews table
 *  - logAuditEvent()      — writes to compliance_audit_logs (fire-and-forget)
 *  - submitReport()       — user-submitted moderation report
 *  - getPendingReports()  — fetch reports queue for admin moderation page
 *  - saveModerationAction() — admin takes action on a report
 *
 * DB tables are typed inline (not in database.ts) because they were added
 * after the initial schema and types will be regenerated via
 * `supabase gen types typescript` after running the migration.
 */

import { supabase, getCurrentUserId } from '../supabase'
import type {
  ContentType,
  DisclosureType,
  RiskReason,
  RiskScore,
  ReportReason,
  ScreeningResult,
  ContentReport,
  ModerationActionType,
} from '../../types/compliance'

// ── Blocked patterns (automatic block — cannot publish) ───────────

const BLOCKED_RULES: { pattern: RegExp; code: string; message: string }[] = [
  {
    pattern: /guaranteed?\s+(returns?|profits?|gains?|income|money)/i,
    code: 'guaranteed_returns',
    message: 'Claims of guaranteed returns are not permitted.',
  },
  {
    pattern: /can'?t?\s+(fail|lose|miss)|(risk[- ]?free)\s+(investment|trade|profit|return)|(100%|certain|definite)\s+(profit|gain|return|winner)/i,
    code: 'guaranteed_returns',
    message: 'Implying zero risk or certainty of profit is not permitted.',
  },
  {
    pattern: /coordinat(e|ed|ing)\s+(buy|sell|pump|trading|short)|pump[- ]?and[- ]?dump|all[- ]?in[,\s]+everyone\s+(buy|sell|short)/i,
    code: 'coordinated_trading',
    message: 'Coordinating group trading actions violates platform rules.',
  },
  {
    pattern: /you\s+(must|need to|have to|should)\s+(buy|sell|short)\s+(now|immediately|today|asap)/i,
    code: 'buy_sell_instructions',
    message: 'Direct personalized buy/sell instructions are not permitted.',
  },
  {
    pattern: /(buy|sell|short)\s+\$?[A-Z]{1,5}\s+(now|immediately|today|asap)\b/i,
    code: 'buy_sell_instructions',
    message: 'Direct buy/sell instructions for specific tickers are not permitted.',
  },
  {
    pattern: /is\s+(committing|involved\s+in|conducting)\s+(fraud|securities\s+fraud|insider\s+trading|illegal\s+activity)/i,
    code: 'fraud_allegation',
    message: 'Unsupported allegations of fraud or illegal activity are not permitted.',
  },
]

// ── High-risk patterns ────────────────────────────────────────────

const HIGH_RISK_RULES: { pattern: RegExp; code: string; message: string }[] = [
  {
    pattern: /\b(buy|sell|short)\s+now\b/i,
    code: 'urgency_instruction',
    message: 'Urgent buy/sell language may be interpreted as a direct trading recommendation.',
  },
  {
    pattern: /\bdon'?t\s+miss\s+(this|out)\b/i,
    code: 'fomo_language',
    message: 'FOMO-inducing urgency language detected.',
  },
  {
    pattern: /\bthis\s+(stock|ticker|coin|crypto|name)\s+will\s+(moon|explode|skyrocket|crash|tank|collapse|10x|100x)/i,
    code: 'price_prediction',
    message: 'Strong directional price prediction detected.',
  },
  {
    pattern: /\bgoing\s+to\s+(moon|explode|skyrocket|10x|100x)/i,
    code: 'price_prediction',
    message: 'Speculative price target language detected.',
  },
  {
    pattern: /\bget\s+(in|out)\s+(now|fast|before|while)\b/i,
    code: 'urgency_instruction',
    message: 'Urgency language that could be read as a trading instruction.',
  },
]

// ── Medium-risk patterns (trigger disclosure prompts) ─────────────

const MEDIUM_RISK_RULES: { pattern: RegExp; code: string; message: string }[] = [
  {
    pattern: /\bI\s+(own|hold|bought|sold|have\s+a\s+position|am\s+(long|short)\s+on)\b/i,
    code: 'position_mention',
    message: 'You mentioned a position. A disclosure is recommended.',
  },
  {
    pattern: /\b(sponsored\s+by|paid\s+(by|to)|partnership\s+with|affiliate|commission|referral)\b/i,
    code: 'sponsorship_mention',
    message: 'Compensation or sponsorship language detected. Disclosure required.',
  },
  {
    pattern: /\b(consider(ing)?|you\s+should\s+look\s+at|think(ing)?\s+about\s+(buying|selling))\b/i,
    code: 'soft_recommendation',
    message: 'Soft investment suggestion detected. Ensure this reflects your opinion only.',
  },
]

// ── Ticker detection ──────────────────────────────────────────────

const TICKER_RE = /\$([A-Z]{1,5})\b|\b(BTC|ETH|SOL|DOGE|ADA|XRP|MATIC|AVAX|BNB|USDT|USDC)\b/g

function detectTickers(text: string): string[] {
  const tickers = new Set<string>()
  for (const m of text.matchAll(TICKER_RE)) tickers.add(m[1] ?? m[2])
  return [...tickers]
}

// ── Core screening (synchronous — no I/O) ────────────────────────

export function screenContent(
  text: string,
  extraTickers: string[] = [],
  isCreator = false,
): ScreeningResult {
  const reasons: RiskReason[] = []
  const warnings: string[] = []
  const disclosureSet = new Set<DisclosureType>()
  let score: RiskScore = 'LOW'

  // 1. BLOCKED check
  for (const rule of BLOCKED_RULES) {
    if (rule.pattern.test(text)) {
      reasons.push({ code: rule.code, message: rule.message, category: 'blocked' })
      score = 'BLOCKED'
    }
  }

  if (score !== 'BLOCKED') {
    // 2. HIGH risk
    for (const rule of HIGH_RISK_RULES) {
      if (rule.pattern.test(text)) {
        reasons.push({ code: rule.code, message: rule.message, category: 'high' })
        warnings.push(rule.message)
        if (score !== 'HIGH') score = 'HIGH'
      }
    }

    // 3. MEDIUM risk
    for (const rule of MEDIUM_RISK_RULES) {
      if (rule.pattern.test(text)) {
        reasons.push({ code: rule.code, message: rule.message, category: 'medium' })
        if (score === 'LOW') score = 'MEDIUM'
        if (rule.code === 'position_mention') disclosureSet.add('position_held')
        if (rule.code === 'sponsorship_mention') {
          disclosureSet.add('sponsored')
          disclosureSet.add('compensation_received')
        }
      }
    }
  }

  // Tickers always trigger position disclosure option
  const tickers = detectTickers(text)
  const allTickers = [...new Set([...tickers, ...extraTickers.filter(Boolean)])]
  if (allTickers.length > 0) disclosureSet.add('position_held')

  // Creators have stricter rules — always require educational disclaimer
  if (isCreator) disclosureSet.add('educational_only')
  // All users get educational_only as a baseline disclosure option
  disclosureSet.add('educational_only')

  return {
    score,
    reasons,
    requiredDisclosures: [...disclosureSet],
    warnings,
  }
}

// ── Persist compliance review ─────────────────────────────────────

export async function saveComplianceReview(params: {
  contentType: ContentType
  contentId: string | null
  originalText: string
  tickers: string[]
  result: ScreeningResult
  disclosuresAccepted: DisclosureType[]
  outcome: 'published' | 'blocked' | 'abandoned'
}): Promise<string | null> {
  const userId = await getCurrentUserId()
  // 'compliance_reviews' is not yet in database.ts (added by this migration).
  // Use `as never` to bypass the generated type until `supabase gen types` is re-run.
  const { data, error } = await (supabase as never as {
    from: (t: string) => {
      insert: (r: object) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } }
    }
  }).from('compliance_reviews').insert({
    user_id: userId,
    content_type: params.contentType,
    content_id: params.contentId,
    original_text: params.originalText,
    tickers: params.tickers,
    risk_score: params.result.score,
    risk_reasons: params.result.reasons,
    disclosures_offered: params.result.requiredDisclosures,
    disclosures_accepted: params.disclosuresAccepted,
    warnings_shown: params.result.warnings,
    outcome: params.outcome,
  }).select('id').single()

  if (error) { console.warn('[compliance] saveReview:', error.message); return null }
  return data?.id ?? null
}

// ── Audit log (fire-and-forget) ───────────────────────────────────

export async function logAuditEvent(params: {
  eventType: string
  contentType?: ContentType
  contentId?: string
  reviewId?: string
  reportId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const userId = await getCurrentUserId()
  await (supabase as never as {
    from: (t: string) => { insert: (r: object) => Promise<unknown> }
  }).from('compliance_audit_logs').insert({
    event_type: params.eventType,
    user_id: userId,
    content_type: params.contentType ?? null,
    content_id: params.contentId ?? null,
    review_id: params.reviewId ?? null,
    report_id: params.reportId ?? null,
    metadata: params.metadata ?? {},
  })
}

// ── Submit a content report ───────────────────────────────────────

export async function submitReport(params: {
  contentType: ContentType
  contentId: string
  reason: ReportReason
  details?: string
}): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId()
  const { error } = await (supabase as never as {
    from: (t: string) => { insert: (r: object) => Promise<{ error: { message: string } | null }> }
  }).from('content_reports').insert({
    reporter_id: userId,
    content_type: params.contentType,
    content_id: params.contentId,
    reason: params.reason,
    details: params.details ?? null,
    status: 'pending',
  })

  if (error) return { success: false, error: error.message }

  logAuditEvent({
    eventType: 'content_reported',
    contentType: params.contentType,
    contentId: params.contentId,
    metadata: { reason: params.reason },
  }).catch(() => {})

  return { success: true }
}

// ── Fetch report queue (for moderation page) ──────────────────────

export async function getPendingReports(): Promise<{
  data: ContentReport[] | null
  error: string | null
}> {
  const { data, error } = await (supabase as never as {
    from: (t: string) => {
      select: (s: string) => {
        order: (col: string, opts: object) => {
          limit: (n: number) => Promise<{ data: ContentReport[] | null; error: { message: string } | null }>
        }
      }
    }
  }).from('content_reports').select('*').order('created_at', { ascending: false }).limit(200)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── Save moderation action ────────────────────────────────────────

export async function saveModerationAction(params: {
  reportId: string
  contentType: ContentType
  contentId: string
  action: ModerationActionType
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const moderatorId = await getCurrentUserId()

  const { error } = await (supabase as never as {
    from: (t: string) => { insert: (r: object) => Promise<{ error: { message: string } | null }> }
  }).from('moderation_actions').insert({
    moderator_id: moderatorId,
    report_id: params.reportId,
    content_type: params.contentType,
    content_id: params.contentId,
    action: params.action,
    notes: params.notes ?? null,
  })

  if (error) return { success: false, error: error.message }

  // Update report status
  const newStatus = params.action === 'dismissed' ? 'dismissed' : 'actioned'
  await (supabase as never as {
    from: (t: string) => {
      update: (r: object) => { eq: (col: string, val: string) => Promise<unknown> }
    }
  }).from('content_reports').update({ status: newStatus }).eq('id', params.reportId)

  logAuditEvent({
    eventType: 'moderation_action',
    contentType: params.contentType,
    contentId: params.contentId,
    reportId: params.reportId,
    metadata: { action: params.action, notes: params.notes },
  }).catch(() => {})

  return { success: true }
}
