import { useState } from 'react';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ReelActionButton from './ReelActionButton';

interface SaveButtonProps {
  isSaved: boolean;
  onToggle: () => void;
  variant?: 'rail' | 'bar';
}

// Generic "bookmark this reel/video" toggle — distinct from the existing ticker-Watchlist
// save action (see ReelMoreMenu), which saves a stock symbol, not the video itself.
export default function SaveButton({ isSaved, onToggle, variant = 'rail' }: SaveButtonProps) {
  const [pop, setPop] = useState(false);
  const rail = variant === 'rail';

  const handleClick = () => {
    if (!isSaved) {
      setPop(true);
      window.setTimeout(() => setPop(false), 280);
    }
    onToggle();
  };

  return (
    <ReelActionButton
      icon={
        isSaved
          ? <BookmarkIcon sx={{ fontSize: rail ? 22 : 20, color: rail ? '#000000' : 'var(--brand)' }} />
          : <BookmarkBorderIcon sx={{ fontSize: rail ? 22 : 20, color: rail ? '#fff' : '#374151' }} />
      }
      label={isSaved ? 'Remove from saved' : 'Save'}
      onClick={handleClick}
      variant={variant}
      active={isSaved}
      activeBgClass="bg-mint"
      pop={pop}
    >
      {rail ? (
        isSaved && <span className="text-[10px] font-medium text-white">Saved</span>
      ) : (
        <span className={`text-sm font-medium ${isSaved ? 'text-brand' : 'text-neutral-700'}`}>
          {isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </ReelActionButton>
  );
}
