import { formatCount } from './format';

interface ReelMetadataProps {
  likeCount?: number;
  commentCount?: number;
  /** Already-formatted view count (e.g. "234K") or a raw number to format. */
  viewCount?: string | number;
  className?: string;
}

// Compact "234K views · 24.5K likes · 892 comments" text row — used where there's no
// per-icon count display (e.g. the horizontal engagement bar on the video watch page).
export default function ReelMetadata({ likeCount, commentCount, viewCount, className = '' }: ReelMetadataProps) {
  const parts: string[] = [];
  if (viewCount !== undefined) parts.push(`${typeof viewCount === 'number' ? formatCount(viewCount) : viewCount} views`);
  if (likeCount !== undefined) parts.push(`${formatCount(likeCount)} likes`);
  if (commentCount !== undefined) parts.push(`${formatCount(commentCount)} comments`);

  if (parts.length === 0) return null;

  return <p className={`text-sm text-neutral-500 ${className}`}>{parts.join(' · ')}</p>;
}
