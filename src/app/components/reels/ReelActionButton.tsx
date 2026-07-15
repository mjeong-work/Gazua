import type { ReactNode } from 'react';
import { motion } from 'motion/react';

interface ReelActionButtonProps {
  icon: ReactNode;
  /** aria-label / title — required for every icon-only button. */
  label: string;
  onClick: () => void;
  /** rail = circular dark backdrop-blur button overlaid on video. bar = flat light pill on a white page. */
  variant?: 'rail' | 'bar';
  /** md = primary action (Like/Comment/Save), visually dominant. sm = secondary (More), de-emphasized. */
  size?: 'md' | 'sm';
  active?: boolean;
  /** rail-only: circle background class when active. */
  activeBgClass?: string;
  /** Brief scale-pop, caller toggles this true for ~200ms on activation. */
  pop?: boolean;
  /** Caption rendered below (rail) / beside (bar) the icon — count text, "Saved", etc. */
  children?: ReactNode;
  /** Additional classes for the outer button (e.g. `ml-auto` to push it to the end of a bar). */
  className?: string;
}

// Shared base for every Reels engagement control (Like/Comment/Save/More) so the
// hover/focus/animation behavior and rail-vs-bar visual treatment stays in one place.
export default function ReelActionButton({
  icon,
  label,
  onClick,
  variant = 'rail',
  size = 'md',
  active = false,
  activeBgClass = 'bg-red-500',
  pop = false,
  children,
  className = '',
}: ReelActionButtonProps) {
  const rail = variant === 'rail';
  const circleSize = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const inactiveBg = size === 'sm' ? 'bg-white/10' : 'bg-white/20';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex ${rail ? 'flex-col' : 'flex-row'} items-center gap-1 outline-none transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 ${rail ? 'focus-visible:ring-white/70' : 'focus-visible:ring-black/20'} rounded-full ${size === 'sm' ? 'opacity-80 hover:opacity-100 transition-opacity' : ''} ${className}`}
    >
      <motion.div
        animate={{ scale: pop ? 1.18 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className={[
          'flex items-center justify-center',
          rail ? `${circleSize} rounded-full backdrop-blur-sm ${active ? activeBgClass : inactiveBg}` : '',
        ].join(' ')}
      >
        {icon}
      </motion.div>
      {children}
    </button>
  );
}
