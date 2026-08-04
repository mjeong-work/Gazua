import { useState } from 'react'
import type { DisclosureType } from '../../../types/compliance'

const BADGE_LABEL: Partial<Record<DisclosureType, string>> = {
  sponsored: 'Sponsored Content',
  position_held: 'Creator Position Disclosed',
  affiliate: 'Affiliate Link',
  compensation_received: 'Compensation Received',
}

function DisclosureBadges({ disclosures }: { disclosures: DisclosureType[] }) {
  const labels = disclosures.map((d) => BADGE_LABEL[d]).filter((label): label is string => Boolean(label))
  if (labels.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

/**
 * ContentDisclaimer
 *
 * Renders the platform-mandated UGC disclaimer on every post and reel card.
 * compact=true  → single line for tight card footers
 * compact=false → multi-line with heading, for standalone use
 * disclosures   → optional creator-disclosed items (sponsored, position held, etc.),
 *                 rendered as small badges above the disclaimer text
 * collapsible   → compact-mode only. Starts collapsed behind a "더보기" toggle instead of
 *                 always showing the full sentence — used in the main feed where every post
 *                 repeats the same disclaimer and it reads as noise at full length.
 */
export default function ContentDisclaimer({
  compact = true,
  disclosures,
  collapsible = false,
}: {
  compact?: boolean
  disclosures?: DisclosureType[]
  collapsible?: boolean
}) {
  const [expanded, setExpanded] = useState(!collapsible)

  if (compact) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        {disclosures && <DisclosureBadges disclosures={disclosures} />}
        {collapsible && !expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            더보기
          </button>
        ) : (
          <p className="text-[10px] text-gray-400 leading-tight">
            User-generated content · Not investment advice · Gazua does not endorse or guarantee this content.
            {collapsible && (
              <button
                onClick={() => setExpanded(false)}
                className="ml-1.5 text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                접기
              </button>
            )}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {disclosures && <DisclosureBadges disclosures={disclosures} />}
      <p className="text-[10px] text-gray-400 leading-snug">
        <span className="font-medium">Disclaimer: </span>
        This content is user-generated and represents the author's personal opinion only.
        It is not investment advice and should not be relied upon as such.
        Gazua does not endorse, verify, or guarantee any content posted on this platform.
      </p>
    </div>
  )
}
