/**
 * ContentDisclaimer
 *
 * Renders the platform-mandated UGC disclaimer on every post and reel card.
 * compact=true  → single line for tight card footers
 * compact=false → multi-line with heading, for standalone use
 */
export default function ContentDisclaimer({ compact = true }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[10px] text-gray-400 leading-tight mt-3 pt-3 border-t border-gray-100">
        User-generated content · Not investment advice · Gazua does not endorse or guarantee this content.
      </p>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] text-gray-400 leading-snug">
        <span className="font-medium">Disclaimer: </span>
        This content is user-generated and represents the author's personal opinion only.
        It is not investment advice and should not be relied upon as such.
        Gazua does not endorse, verify, or guarantee any content posted on this platform.
      </p>
    </div>
  )
}
