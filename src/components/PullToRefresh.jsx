// src/components/PullToRefresh.jsx
//
// Pull-to-refresh for the MARS web app.
//
// Attaches touch listeners to the scrollable `app-main` container.
// When the user pulls down from the top (scroll position = 0) by at
// least THRESHOLD px, a visual indicator drops in and window.location.reload()
// is called on release.
//
// Design:
//   - Only activates when the container is already scrolled to the top
//   - Shows a circular arrow indicator that fills as the user pulls
//   - Snaps back if the user doesn't pull far enough
//   - Disabled on desktop (pointer device) — only fires on touch
//
import { useEffect, useRef, useCallback } from 'react';
import './PullToRefresh.css';

const THRESHOLD  = 72;   // px of pull needed to trigger refresh
const MAX_PULL   = 110;  // px — caps the visual travel distance

export default function PullToRefresh() {
  const indicatorRef = useRef(null);
  const startYRef    = useRef(null);
  const pullingRef   = useRef(false);
  const triggeredRef = useRef(false);

  const getScrollContainer = useCallback(() =>
    document.querySelector('.app-main'), []);

  const setIndicator = useCallback((pull) => {
    const el = indicatorRef.current;
    if (!el) return;
    const clamped  = Math.min(pull, MAX_PULL);
    const progress = Math.min(clamped / THRESHOLD, 1); // 0 → 1
    const translateY = clamped - 56; // starts above viewport, slides in

    el.style.transform  = `translateX(-50%) translateY(${translateY}px)`;
    el.style.opacity    = String(progress);

    // Rotate the icon as the user pulls
    const icon = el.querySelector('.ptr-icon');
    if (icon) icon.style.transform = `rotate(${progress * 180}deg)`;

    // Colour shift: grey → green at threshold
    el.classList.toggle('ptr-ready', progress >= 1);
  }, []);

  const resetIndicator = useCallback(() => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transform = 'translateX(-50%) translateY(-56px)';
    el.style.opacity   = '0';
    el.classList.remove('ptr-ready', 'ptr-refreshing');
    const icon = el.querySelector('.ptr-icon');
    if (icon) icon.style.transform = '';
  }, []);

  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const onTouchStart = (e) => {
      // Only start tracking if at the very top of the scroll container
      if (container.scrollTop > 2) return;
      // Ignore multi-touch
      if (e.touches.length !== 1) return;
      startYRef.current  = e.touches[0].clientY;
      pullingRef.current = false;
      triggeredRef.current = false;
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      if (container.scrollTop > 2) {
        startYRef.current = null;
        return;
      }

      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        startYRef.current = null;
        return;
      }

      // We're pulling down — prevent the browser's native pull-to-refresh
      // (Chrome Android) and the page from scrolling up
      e.preventDefault();
      pullingRef.current = true;
      setIndicator(dy);

      if (dy >= THRESHOLD && !triggeredRef.current) {
        triggeredRef.current = true;
        // Haptic feedback on supported devices
        if (navigator.vibrate) navigator.vibrate(10);
      }
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) {
        startYRef.current = null;
        return;
      }

      if (triggeredRef.current) {
        // Show spinning state briefly before reload
        const el = indicatorRef.current;
        if (el) {
          el.classList.add('ptr-refreshing');
          el.style.transform = 'translateX(-50%) translateY(16px)';
          el.style.opacity   = '1';
        }
        setTimeout(() => window.location.reload(), 400);
      } else {
        resetIndicator();
      }

      startYRef.current  = null;
      pullingRef.current = false;
    };

    // passive: false so we can call preventDefault() in onTouchMove
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove',  onTouchMove,  { passive: false });
    container.addEventListener('touchend',   onTouchEnd,   { passive: true });
    container.addEventListener('touchcancel',onTouchEnd,   { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove',  onTouchMove);
      container.removeEventListener('touchend',   onTouchEnd);
      container.removeEventListener('touchcancel',onTouchEnd);
    };
  }, [getScrollContainer, setIndicator, resetIndicator]);

  return (
    <div className="ptr-indicator" ref={indicatorRef} aria-hidden="true">
      <i className="ti ti-refresh ptr-icon" />
    </div>
  );
}
