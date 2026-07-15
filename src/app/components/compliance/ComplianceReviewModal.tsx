import { useState, useMemo } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { screenContent } from '../../../lib/services/compliance.service'
import type { DisclosureType, RiskScore } from '../../../types/compliance'

interface ComplianceReviewModalProps {
  content: string
  tickers: string[]
  isCreator?: boolean
  onCancel: () => void
  onApprove: (disclosures: DisclosureType[]) => void
}

const SCORE_CONFIG: Record<
  RiskScore,
  { label: string; textColor: string; bgBorder: string; description: string }
> = {
  LOW: {
    label: 'Low Risk',
    textColor: 'text-green-700',
    bgBorder: 'bg-green-50 border-green-200',
    description:
      'Your content looks good. Please review the disclosures below before publishing.',
  },
  MEDIUM: {
    label: 'Review Recommended',
    textColor: 'text-amber-700',
    bgBorder: 'bg-amber-50 border-amber-200',
    description:
      'Your content contains language that warrants attention. Please address the items below.',
  },
  HIGH: {
    label: 'High-Risk Language',
    textColor: 'text-orange-700',
    bgBorder: 'bg-orange-50 border-orange-200',
    description:
      'Your content contains high-risk language. You may still publish after acknowledging the warnings below.',
  },
  BLOCKED: {
    label: 'Content Blocked',
    textColor: 'text-red-700',
    bgBorder: 'bg-red-50 border-red-200',
    description:
      'Your content cannot be published as written. Please edit and remove the flagged language.',
  },
}

const DISCLOSURE_LABELS: Record<DisclosureType, string> = {
  position_held:          'I hold or have recently held a position in the assets mentioned.',
  no_position:            'I do not currently hold a position in the assets mentioned.',
  sponsored:              'This content is sponsored or I was paid to create it.',
  affiliate:              'This content contains affiliate links or I earn a referral commission.',
  compensation_received:  'I received or expect compensation (cash, equity, or other) related to this content.',
  educational_only:       'This content is for educational purposes only and is not personalized investment advice.',
}

const REASON_DOT_COLOR: Record<'blocked' | 'high' | 'medium', string> = {
  blocked: 'text-red-500',
  high:    'text-orange-500',
  medium:  'text-amber-500',
}

export default function ComplianceReviewModal({
  content,
  tickers,
  isCreator = false,
  onCancel,
  onApprove,
}: ComplianceReviewModalProps) {
  const result = useMemo(
    () => screenContent(content, tickers, isCreator),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const cfg = SCORE_CONFIG[result.score]
  const isBlocked = result.score === 'BLOCKED'

  const [accepted, setAccepted] = useState<Set<DisclosureType>>(new Set())
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)

  const toggle = (d: DisclosureType) =>
    setAccepted(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })

  const canPublish = !isBlocked && disclaimerChecked

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Content Review</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Risk score banner */}
          <div className={`border rounded-xl p-4 ${cfg.bgBorder}`}>
            <p className={`text-sm font-bold mb-1 ${cfg.textColor}`}>{cfg.label}</p>
            <p className={`text-sm ${cfg.textColor}`}>{cfg.description}</p>
          </div>

          {/* Flagged / blocked reasons */}
          {result.reasons.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                {isBlocked ? 'Blocked Content' : 'Flagged Language'}
              </p>
              <ul className="space-y-2">
                {result.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm items-start">
                    <span className={`mt-0.5 ${REASON_DOT_COLOR[r.category]}`}>●</span>
                    <span className="text-gray-700">{r.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclosures (hidden when BLOCKED) */}
          {!isBlocked && result.requiredDisclosures.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Disclosures
              </p>
              <p className="text-xs text-gray-400 mb-3">Select all that apply.</p>
              <ul className="space-y-2.5">
                {result.requiredDisclosures.map(d => (
                  <li key={d}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accepted.has(d)}
                        onChange={() => toggle(d)}
                        className="mt-0.5 accent-black flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">
                        {DISCLOSURE_LABELS[d]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory platform disclaimer */}
          {!isBlocked && (
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclaimerChecked}
                  onChange={e => setDisclaimerChecked(e.target.checked)}
                  className="mt-0.5 accent-black flex-shrink-0"
                />
                <span className="text-sm text-gray-600 leading-snug">
                  I understand this content represents my personal opinion and is not professional investment advice. Gazua does not endorse or guarantee any content posted on this platform.
                </span>
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {isBlocked ? 'Edit Content' : 'Go Back'}
            </button>
            {!isBlocked && (
              <button
                onClick={() => onApprove([...accepted])}
                disabled={!canPublish}
                className="flex-1 py-3 bg-black text-white rounded-full text-sm font-bold hover:bg-black/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm & Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
