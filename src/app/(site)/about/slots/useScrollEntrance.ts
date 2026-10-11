import { type RefObject, useEffect, useRef } from 'react';
import { clamp } from 'src/utils/math';

import { isCalm } from './motion';
import type { FrameLoop } from './useFrameLoop';

/** Tracks whether an element is on screen at all, as a ref that can be read from timers. */
export function useOnScreen(element: RefObject<HTMLElement | null>): RefObject<boolean> {
  // Without IntersectionObserver (tests) assume it can be seen.
  const onScreen = useRef(typeof IntersectionObserver !== 'function');

  useEffect(() => {
    if (!element.current || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
    });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [element]);

  return onScreen;
}

/**
 * Ties the stage to the scroll: the machine rises and grows as its section comes up the page,
 * and `onPinned` fires once, the first time the section is pinned to the top of the viewport.
 */
export function useScrollEntrance(
  loop: FrameLoop,
  section: RefObject<HTMLElement | null>,
  stage: RefObject<HTMLElement | null>,
  onPinned: () => void,
) {
  const live = useRef({ moved: true, pinned: false, onPinned });

  useEffect(() => {
    live.current.onPinned = onPinned;
  }, [onPinned]);

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    // jsdom has no layout to measure.
    if (!sectionEl || !stageEl || typeof window.matchMedia !== 'function') return;

    const remove = loop.add(() => {
      if (!live.current.moved) return false;
      live.current.moved = false;
      const box = sectionEl.getBoundingClientRect();
      const viewport = window.innerHeight;
      const entered = isCalm() ? 1 : clamp(1 - box.top / (viewport * 0.85), 0, 1);
      const eased = 1 - Math.pow(1 - entered, 3);
      stageEl.style.transform =
        entered >= 1
          ? 'none'
          : `translateY(${((1 - eased) * 9).toFixed(2)}svh) scale(${(0.88 + 0.12 * eased).toFixed(3)})`;
      stageEl.style.opacity = (0.3 + 0.7 * entered).toFixed(2);
      if (!live.current.pinned && box.top <= viewport * 0.06 && box.bottom > viewport * 0.6) {
        live.current.pinned = true;
        live.current.onPinned();
      }
      return false;
    });

    const onMove = () => {
      live.current.moved = true;
      loop.wake();
    };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      remove();
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    };
  }, [loop, section, stage]);
}
