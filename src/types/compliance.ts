// ================================================================
// Gazua Compliance Safety Layer — TypeScript Types
// ================================================================

export type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED'

export type ContentType = 'post' | 'reel' | 'video' | 'comment' | 'creator_profile'

export type ReportReason =
  | 'guaranteed_returns'
  | 'coordinated_trading'
  | 'buy_sell_instructions'
  | 'undisclosed_promotion'
  | 'fraud_allegation'
  | 'other'

export type ModerationActionType =
  | 'dismissed'
  | 'warning_sent'
  | 'content_removed'
  | 'user_suspended'
  | 'content_restored'
  | 'user_reinstated'

export type DisclosureType =
  | 'position_held'
  | 'no_position'
  | 'sponsored'
  | 'affiliate'
  | 'compensation_received'
  | 'educational_only'

export interface RiskReason {
  code: string
  message: string
  category: 'blocked' | 'high' | 'medium'
}

export interface ScreeningResult {
  score: RiskScore
  reasons: RiskReason[]
  requiredDisclosures: DisclosureType[]
  warnings: string[]
}

export interface ComplianceReview {
  id: string
  user_id: string | null
  content_type: ContentType
  content_id: string | null
  original_text: string
  tickers: string[]
  risk_score: RiskScore
  risk_reasons: RiskReason[]
  disclosures_offered: DisclosureType[]
  disclosures_accepted: DisclosureType[]
  warnings_shown: string[]
  outcome: 'published' | 'blocked' | 'abandoned'
  created_at: string
}

export interface ContentReport {
  id: string
  reporter_id: string | null
  content_type: ContentType
  content_id: string
  reason: ReportReason
  details: string | null
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  created_at: string
}

export interface ModerationActionRecord {
  id: string
  moderator_id: string | null
  report_id: string
  content_type: ContentType
  content_id: string
  action: ModerationActionType
  notes: string | null
  created_at: string
}

export interface ComplianceAuditLog {
  id: string
  event_type: string
  user_id: string | null
  content_type: ContentType | null
  content_id: string | null
  review_id: string | null
  report_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Algorithm-safe label types — neutral descriptors that do not imply
// Gazua endorsement or personalized recommendations.
export type AlgorithmLabel =
  | 'trending_discussion'
  | 'most_discussed'
  | 'creator_research'
  | 'watchlist_idea'
  | 'beginner_friendly'
  | 'educational_content'
