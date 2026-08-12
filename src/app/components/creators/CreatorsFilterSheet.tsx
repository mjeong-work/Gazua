import { motion, useDragControls, useReducedMotion } from 'motion/react';
import CloseIcon from '@mui/icons-material/Close';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

const DIFFICULTY_OPTIONS: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

const PILL_CLASS = (active: boolean) =>
  `px-5 py-2.5 rounded-sm text-sm font-medium border transition-colors ${
    active ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
  }`;

interface CreatorsFilterSheetProps {
  difficultyFilters: Set<Difficulty>;
  onToggleDifficulty: (level: Difficulty) => void;
  myFollowingOnly: boolean;
  onToggleMyFollowing: () => void;
  onClear: () => void;
  onClose: () => void;
}

// Mobile-only bottom sheet for the /creators Difficulty filter — same drag-to-dismiss sheet
// convention as ReelInlineCommentsSheet (rounded-t-md, drag handle, spring slide-up), just
// fixed to the viewport instead of scoped to a reel card since this is a page-level control.
export default function CreatorsFilterSheet({
  difficultyFilters,
  onToggleDifficulty,
  myFollowingOnly,
  onToggleMyFollowing,
  onClear,
  onClose,
}: CreatorsFilterSheetProps) {
  const dragControls = useDragControls();
  const prefersReducedMotion = useReducedMotion();
  useEscapeKey(onClose);

  const handleDragEnd = (_event: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 80 || info.velocity.y > 600) onClose();
  };

  const hasActiveFilters = difficultyFilters.size > 0 || myFollowingOnly;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="creators-filter-title">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        drag={prefersReducedMotion ? false : 'y'}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 32, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-md bg-white shadow-2xl flex flex-col touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 bg-neutral-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 pb-4 border-b border-neutral-100 flex-shrink-0">
          <h2 id="creators-filter-title" className="text-base font-bold">Filter</h2>
          <button onClick={onClose} aria-label="Close filters" className="p-1 hover:bg-neutral-100 rounded-full transition-colors">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="px-5 py-5 touch-auto overflow-y-auto space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Level</h3>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={difficultyFilters.has(level)}
                  onClick={() => onToggleDifficulty(level)}
                  className={PILL_CLASS(difficultyFilters.has(level))}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-2">Select one or more. Leave empty to show all levels.</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Show</h3>
            <button
              type="button"
              aria-pressed={myFollowingOnly}
              onClick={onToggleMyFollowing}
              className={PILL_CLASS(myFollowingOnly)}
            >
              My Following
            </button>
          </div>
        </div>

        <div
          className="flex items-center gap-3 px-5 py-4 border-t border-neutral-100 flex-shrink-0"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClear}
            disabled={!hasActiveFilters}
            className="flex-1 px-4 py-3 rounded-sm text-sm font-medium border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-sm text-sm font-medium bg-black text-white hover:bg-black/90 transition-colors"
          >
            Show results
          </button>
        </div>
      </motion.div>
    </div>
  );
}
