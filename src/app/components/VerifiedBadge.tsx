import { cn } from './ui/utils';

interface VerifiedBadgeProps {
  /** Icon size in pixels — matches whatever fixed width/height the call site previously hardcoded. */
  size?: number;
  /** Optional tooltip — only the profile-header usage had one before this was extracted. */
  title?: string;
  className?: string;
}

// The "creator is verified" checkmark, previously inlined as the same raw SVG path in ~10
// files (audit finding). Represents credibility_level === 'verified_pro' specifically — do not
// reuse this for unrelated checkmark icons (e.g. the "Actual Portfolio" badge's icon, which is
// a different concept that happens to reuse the same glyph).
export default function VerifiedBadge({ size = 16, title, className = '' }: VerifiedBadgeProps) {
  const icon = (
    <svg
      className={cn('text-brand flex-shrink-0', className)}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (!title) return icon;
  return (
    <span title={title} className="inline-flex">
      {icon}
    </span>
  );
}
