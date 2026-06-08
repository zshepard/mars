// src/components/SwipeItem.jsx
//
// Wraps any list item with swipe-to-delete behaviour.
// Swipe left → reveals a red delete button on the right.
// Swipe right or tap elsewhere → snaps back.
//
// Usage:
//   <SwipeItem onDelete={() => handleDelete(id)} label="Delete">
//     <YourRowContent />
//   </SwipeItem>

import { useState, useRef, useCallback } from 'react';
import './SwipeItem.css';

const THRESHOLD  = 60;   // px — how far to swipe before snapping to reveal
const REVEAL_W   = 72;   // px — width of the revealed delete zone
const MAX_VERT   = 30;   // px — max vertical drift to count as horizontal swipe

export default function SwipeItem({ children, onDelete, label = 'Delete', disabled = false }) {
  const [offset, setOffset]   = useState(0);   // current translateX
  const [revealed, setRevealed] = useState(false);
  const startRef  = useRef(null);
  const offsetRef = useRef(0);

  const onTouchStart = useCallback((e) => {
    if (disabled) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, base: offsetRef.current };
  }, [disabled]);

  const onTouchMove = useCallback((e) => {
    if (!startRef.current || disabled) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = Math.abs(t.clientY - startRef.current.y);

    // If vertical movement dominates, don't intercept
    if (dy > MAX_VERT && Math.abs(dx) < dy) return;

    // Prevent page scroll when swiping horizontally
    e.preventDefault();

    const raw = startRef.current.base + dx;
    // Clamp: can only go left (negative) up to -REVEAL_W, right back to 0
    const clamped = Math.max(-REVEAL_W, Math.min(0, raw));
    offsetRef.current = clamped;
    setOffset(clamped);
  }, [disabled]);

  const onTouchEnd = useCallback(() => {
    if (!startRef.current || disabled) return;
    startRef.current = null;

    if (offsetRef.current < -THRESHOLD) {
      // Snap to revealed
      offsetRef.current = -REVEAL_W;
      setOffset(-REVEAL_W);
      setRevealed(true);
    } else {
      // Snap back
      offsetRef.current = 0;
      setOffset(0);
      setRevealed(false);
    }
  }, [disabled]);

  const snapBack = useCallback(() => {
    offsetRef.current = 0;
    setOffset(0);
    setRevealed(false);
  }, []);

  const handleDelete = useCallback(() => {
    snapBack();
    onDelete?.();
  }, [onDelete, snapBack]);

  return (
    <div
      className={`swipe-item-wrapper ${revealed ? 'revealed' : ''}`}
      // Tap anywhere outside the delete zone to snap back
      onMouseLeave={revealed ? snapBack : undefined}
    >
      {/* Sliding content */}
      <div
        className="swipe-item-content"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      {/* Delete action revealed on the right */}
      <button
        className="swipe-item-delete"
        style={{ width: REVEAL_W }}
        onClick={handleDelete}
        aria-label={label}
      >
        <i className="ti ti-trash" />
        <span>{label}</span>
      </button>
    </div>
  );
}
