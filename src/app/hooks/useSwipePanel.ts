import { useState, useRef } from 'react';

export function useSwipePanel() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (deltaX > 50) setIsPanelOpen(true);
      else if (deltaX < -50) setIsPanelOpen(false);
    },
  };

  return { isPanelOpen, openPanel, closePanel, swipeHandlers };
}
