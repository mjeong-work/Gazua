import { useState } from 'react';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ReelActionButton from './ReelActionButton';
import { formatCount } from './format';

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
  variant?: 'rail' | 'bar';
}

export default function LikeButton({ isLiked, likeCount, onToggle, variant = 'rail' }: LikeButtonProps) {
  const [pop, setPop] = useState(false);
  const rail = variant === 'rail';

  const handleClick = () => {
    if (!isLiked) {
      setPop(true);
      window.setTimeout(() => setPop(false), 280);
    }
    onToggle();
  };

  return (
    <ReelActionButton
      icon={
        isLiked
          ? <FavoriteIcon sx={{ fontSize: rail ? 22 : 20, color: rail ? '#fff' : '#ef4444' }} />
          : <FavoriteBorderIcon sx={{ fontSize: rail ? 22 : 20, color: rail ? '#fff' : '#374151' }} />
      }
      label={isLiked ? 'Unlike' : 'Like'}
      onClick={handleClick}
      variant={variant}
      active={isLiked}
      activeBgClass="bg-red-500"
      pop={pop}
    >
      <span className={rail ? 'text-xs font-medium text-white' : 'text-sm font-medium text-gray-700'}>
        {formatCount(likeCount)}
      </span>
    </ReelActionButton>
  );
}
