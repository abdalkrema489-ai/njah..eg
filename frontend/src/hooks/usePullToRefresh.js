// src/hooks/usePullToRefresh.js
// Native-feeling pull-to-refresh for any page
import { useEffect, useRef, useCallback } from 'react';

/**
 * usePullToRefresh — attach to any page to get pull-to-refresh behaviour.
 * @param {Function} onRefresh  — called when user pulls past threshold
 * @param {number}   threshold  — px to pull before triggering (default 80)
 * @returns {React.RefObject}   — ref to attach to the indicator element
 *
 * Usage:
 *   const indicatorRef = usePullToRefresh(() => refetch());
 *   <div ref={indicatorRef} style={{ position:'fixed',top:16,left:'50%',
 *     transform:'translateX(-50%)',fontSize:24,opacity:0,
 *     transition:'opacity 0.2s',zIndex:999,pointerEvents:'none' }}>🔄</div>
 */
export function usePullToRefresh(onRefresh, threshold = 80) {
  const startY    = useRef(0);
  const pulling   = useRef(false);
  const indicator = useRef(null);

  const stableRefresh = useCallback(onRefresh, []); // eslint-disable-line

  useEffect(() => {
    const el = document.getElementById('app-content') || document.body;

    const onTouchStart = (e) => {
      // Only trigger when scrolled to top
      if (window.scrollY === 0) {
        startY.current  = e.touches[0].clientY;
        pulling.current  = true;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && dy < threshold * 1.5) {
        e.preventDefault(); // prevent native scroll bounce
        if (indicator.current) {
          const progress = Math.min(dy / threshold, 1);
          indicator.current.style.opacity   = String(progress);
          indicator.current.style.transform =
            `translateX(-50%) translateY(${dy * 0.4}px) rotate(${progress * 180}deg)`;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (!pulling.current) return;
      pulling.current = false;
      const dy = e.changedTouches[0].clientY - startY.current;

      // Trigger refresh if pulled past threshold
      if (dy >= threshold) {
        navigator.vibrate?.(50);
        stableRefresh();
      }

      // Reset indicator
      if (indicator.current) {
        indicator.current.style.transition = 'all 0.3s ease';
        indicator.current.style.opacity    = '0';
        indicator.current.style.transform  = 'translateX(-50%) translateY(0) rotate(0deg)';
        setTimeout(() => {
          if (indicator.current) indicator.current.style.transition = '';
        }, 300);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [stableRefresh, threshold]);

  return indicator;
}
