import { motion } from 'motion/react';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IosShareIcon from '@mui/icons-material/IosShare';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReportButton from '../compliance/ReportButton';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ReelMoreMenuProps {
  contentId: string;
  onClose: () => void;
  onCopyLink: () => void;
  onNotInterested: () => void;
  shareUrl: string;
  shareTitle: string;
  /** Ticker identified in the reel/video, if any — enables the Watchlist row. */
  ticker?: string | null;
  isTickerSaved?: boolean;
  onToggleTickerSave?: () => void;
}

const ROW_CLASS = 'w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-left';

// Centered card, matching ReportButton's own modal convention. Absorbs what used to be a
// separate Share menu — the standalone Share rail icon was folded in here to keep the rail
// down to Like/Comment/Save/More, matching Instagram's lighter action-bar footprint. The
// ticker-Watchlist action lives here too (relocated from the rail's old Save button, which
// is now a generic bookmark).
export default function ReelMoreMenu({
  contentId,
  onClose,
  onCopyLink,
  onNotInterested,
  shareUrl,
  shareTitle,
  ticker,
  isTickerSaved,
  onToggleTickerSave,
}: ReelMoreMenuProps) {
  useEscapeKey(onClose);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: shareTitle, url: shareUrl });
      onClose();
    } catch {
      // User cancelled the native share sheet — not an error.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[65] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="More options"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="bg-white rounded-2xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">More Options</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="space-y-1">
          {canNativeShare && (
            <button onClick={handleNativeShare} className={ROW_CLASS}>
              <IosShareIcon sx={{ fontSize: 20 }} />
              Share via…
            </button>
          )}
          <button onClick={onCopyLink} className={ROW_CLASS}>
            <ContentCopyIcon sx={{ fontSize: 20 }} />
            Copy Link
          </button>
          {ticker && onToggleTickerSave && (
            <button onClick={onToggleTickerSave} className={ROW_CLASS}>
              <TrendingUpIcon sx={{ fontSize: 20, color: isTickerSaved ? 'var(--brand)' : undefined }} />
              {isTickerSaved ? `Remove $${ticker} from Watchlist` : `Add $${ticker} to Watchlist`}
            </button>
          )}
          <button onClick={onNotInterested} className={ROW_CLASS}>
            <VisibilityOffIcon sx={{ fontSize: 20 }} />
            Not Interested
          </button>
          <ReportButton contentType="reel" contentId={contentId} label="Report" />
        </div>
      </motion.div>
    </motion.div>
  );
}
