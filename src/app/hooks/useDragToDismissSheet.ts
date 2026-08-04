import { useRef } from 'react';
import { useDragControls } from 'motion/react';

interface DragToDismissOptions {
  onDismiss: () => void;
  /** Downward drag distance (px) past which releasing dismisses the sheet. */
  distanceThreshold?: number;
  /** Downward release velocity (px/s) past which it dismisses regardless of distance — lets a quick flick close it even without dragging far. */
  velocityThreshold?: number;
}

/**
 * Drag-to-dismiss for a bottom sheet, shared by every comment sheet in the app (post comments,
 * reel comments, home-feed inline reel comments) so the gesture behaves identically everywhere
 * and a threshold/animation tweak only has to happen in one place.
 *
 * Two ways to start the drag, both handed off to the same framer-motion `dragControls`:
 *  1. `handlePointerDownOnHandle` — wire to the visible handle bar. Always draggable.
 *  2. `listPointerHandlers` — wire to the scrollable comment list itself. Only hands off to the
 *     drag gesture once the list is scrolled to the very top and the user keeps pulling down,
 *     so it never fights the list's own vertical scroll (checked via the list's own scrollTop
 *     on the event's currentTarget — no extra ref needed).
 */
export function useDragToDismissSheet({
  onDismiss,
  distanceThreshold = 120,
  velocityThreshold = 600,
}: DragToDismissOptions) {
  const dragControls = useDragControls();
  const pullStartY = useRef<number | null>(null);

  const handleDragEnd = (_event: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > distanceThreshold || info.velocity.y > velocityThreshold) onDismiss();
  };

  const handlePointerDownOnHandle = (e: React.PointerEvent) => {
    dragControls.start(e);
  };

  const listPointerHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      pullStartY.current = e.clientY;
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (pullStartY.current == null) return;
      const deltaY = e.clientY - pullStartY.current;
      // >10px of slack before handing off, so a normal tap/scroll-start isn't mistaken for a pull.
      if (e.currentTarget.scrollTop <= 0 && deltaY > 10) {
        dragControls.start(e);
        pullStartY.current = null;
      }
    },
    onPointerUp: () => {
      pullStartY.current = null;
    },
    onPointerCancel: () => {
      pullStartY.current = null;
    },
  };

  return { dragControls, handleDragEnd, handlePointerDownOnHandle, listPointerHandlers };
}
