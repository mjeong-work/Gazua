import type { ReactNode } from 'react';
import { motion } from 'motion/react';
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

// Instagram-style "Create" bottom sheet, opened from the bottom nav's + tab (see AppHeader).
// Drag is handle-only (dragListener=false + dragControls.start on the handle's pointerDown) —
// same convention as the comment sheets. Making the whole sheet draggable instead would make
// framer-motion's drag recognizer intercept the option buttons' clicks (confirmed: selecting an
// option left the sheet stuck mid-drag instead of closing), so the handle stays the one and
// only drag entry point even though this sheet has no scrollable content to protect.
export default function CreateOptionsSheet({ onClose, onSelect }: CreateOptionsSheetProps) {
  const { dragControls, handleDragEnd, handlePointerDownOnHandle } = useDragToDismissSheet({ onDismiss: onClose });

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Create">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
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
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-2xl touch-none pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={handlePointerDownOnHandle}
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <h2 className="text-base font-bold text-center mb-2 px-5">Create</h2>

        <div className="px-3 pb-2 touch-auto">
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className="w-full flex items-center gap-4 px-3 py-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-800">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 truncate">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
