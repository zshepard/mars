// src/hooks/useSwipe.js
//
// Lightweight touch-swipe hook.
// Usage:
//   const handlers = useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown });
//   <div {...handlers}>...</div>
//
// Also exports useSwipeDelete for swipe-to-reveal-delete on list items.

import { useRef, useCallback } from 'react';

const MIN_DISTANCE = 50;   // px — minimum swipe distance to register
const MAX_VERTICAL = 80;   // px — max vertical drift allowed for horizontal swipes

/* ── General swipe hook ─────────────────────────────────────────────── */
export function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown } = {}) {
  const start = useRef(null);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy && absDx > MIN_DISTANCE && absDy < MAX_VERTICAL) {
      // Horizontal swipe
      if (dx < 0 && onSwipeLeft)  onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
    } else if (absDy > absDx && absDy > MIN_DISTANCE) {
      // Vertical swipe
      if (dy < 0 && onSwipeUp)   onSwipeUp();
      if (dy > 0 && onSwipeDown) onSwipeDown();
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return { onTouchStart, onTouchEnd };
}

/* ── Swipe-to-delete hook ───────────────────────────────────────────── */
// Returns { swiped, handlers } where swiped=true reveals the delete action.
// Swiping left reveals delete; swiping right (or tapping elsewhere) hides it.
// eslint-disable-next-line no-unused-vars
export function useSwipeDelete() {
  // placeholder — see SwipeItem component below
  return null;
}
