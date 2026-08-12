import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { useDragToDismissSheet } from '../hooks/useDragToDismissSheet';

export type CreateContentType = 'post' | 'reel' | 'video';

interface CreateOptionsSheetProps {
  onClose: () => void;
  onSelect: (type: CreateContentType) => void;
}

const OPTIONS: { type: CreateContentType; label: string; description: string; icon: ReactNode }[] = [
  {
    type: 'post',
    label: 'Post',
    description: 'Share market insights or start a discussion',
    icon: <ArticleIcon sx={{ fontSize: 22 }} />,
  },
  {
    type: 'reel',
    label: 'Reel',
    description: 'Short-form video about stocks, crypto, or trends',
    icon: <VideoLibraryIcon sx={{ fontSize: 22 }} />,
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Upload a long-form video to your channel',
    icon: <OndemandVideoIcon sx={{ fontSize: 22 }} />,
  },
];

function OptionsList({ onSelect }: { onSelect: (type: CreateContentType) => void }) {
  return (
    <>
      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          className="w-full flex items-center gap-4 px-3 py-3.5 rounded-md hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
        >
          <div className="w-11 h-11 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-800">
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{opt.label}</p>
            <p className="text-xs text-neutral-500 truncate">{opt.description}</p>
          </div>
        </button>
      ))}
    </>
  );
}

// Same breakpoint AppHeader uses to switch between the mobile bottom nav (whose + tab renders
// this as a bottom sheet) and the desktop header (whose Create button renders it as a centered
// dialog instead) — `lg`, 1024px. Kept in sync so this always matches whichever trigger is
// actually visible at the current width, since only one of them exists at a time.
const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

// Instagram-style "Create" picker — a bottom sheet on mobile (opened from the bottom nav's +
// tab), a centered dialog on desktop (opened from the header's Create button). Mobile drag is
// handle-only (dragListener=false + dragControls.start on the handle's pointerDown) — same
// convention as the comment sheets. Making the whole sheet draggable instead would make
// framer-motion's drag recognizer intercept the option buttons' clicks, so the handle stays the
// one and only drag entry point even though this sheet has no scrollable content to protect.
export default function CreateOptionsSheet({ onClose, onSelect }: CreateOptionsSheetProps) {
  const isDesktop = useIsDesktop();
  const { dragControls, handleDragEnd, handlePointerDownOnHandle } = useDragToDismissSheet({ onDismiss: onClose });

  return (
    <div
      className={`fixed inset-0 z-50 flex ${isDesktop ? 'items-center justify-center p-4' : 'items-end justify-center'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Create"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {isDesktop ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white rounded-md shadow-2xl w-[min(380px,90vw)] p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <h2 className="text-base font-bold">Create</h2>
            <button
              onClick={onClose}
              className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
          <div className="px-1 pb-1">
            <OptionsList onSelect={onSelect} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={handleDragEnd}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative w-full rounded-t-md bg-white shadow-2xl touch-none pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onPointerDown={handlePointerDownOnHandle}
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          >
            <div className="w-10 h-1.5 bg-neutral-300 rounded-full" />
          </div>

          <h2 className="text-base font-bold text-center mb-2 px-5">Create</h2>

          <div className="px-3 pb-2 touch-auto">
            <OptionsList onSelect={onSelect} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
