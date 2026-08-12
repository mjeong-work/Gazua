/**
 * AlgorithmicLabel
 *
 * Neutral, algorithm-safe content labels that do not imply Gazua endorsement
 * or personalized recommendations. Use these instead of "Top Pick", "Recommended",
 * or any label that implies curation or investment guidance.
 */

import type { AlgorithmLabel } from '../../../types/compliance'

const LABEL_CONFIG: Record<AlgorithmLabel, { text: string; title: string }> = {
  trending_discussion: {
    text:  'Trending Discussion',
    title: 'Frequently mentioned in community conversations',
  },
  most_discussed: {
    text:  'Most Discussed',
    title: 'High community engagement',
  },
  creator_research: {
    text:  'Creator Research',
    title: 'Published by a verified content creator',
  },
  watchlist_idea: {
    text:  'Watchlist Idea',
    title: 'Frequently saved to member watchlists',
  },
  beginner_friendly: {
    text:  'Beginner Friendly',
    title: 'Suitable for those new to investing',
  },
  educational_content: {
    text:  'Educational Content',
    title: 'Focused on investment concepts and strategies',
  },
}

interface AlgorithmicLabelProps {
  label: AlgorithmLabel
}

export function AlgorithmicLabel({ label }: AlgorithmicLabelProps) {
  const cfg = LABEL_CONFIG[label]
  return (
    <span
      title={cfg.title}
      className="inline-block px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-medium rounded-sm border border-neutral-200 select-none"
    >
      {cfg.text}
    </span>
  )
}

/**
 * Derives an algorithm-safe label from post engagement metrics.
 * Returns null when no label applies (avoids showing labels on ordinary posts).
 */
export function derivePostLabel(
  likeCount: number,
  shareCount: number,
  isVerifiedCreator: boolean,
  category: string,
): AlgorithmLabel | null {
  const engagement = likeCount + shareCount * 2
  if (engagement >= 100) return 'most_discussed'
  if (engagement >= 30)  return 'trending_discussion'
  if (isVerifiedCreator) return 'creator_research'
  if (category === 'Beginner Basics') return 'beginner_friendly'
  if (shareCount >= 5)   return 'watchlist_idea'
  return null
}
