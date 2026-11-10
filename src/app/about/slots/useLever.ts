import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react';
import { clamp } from 'src/utils/math';

const DRAG_STARTS_PX = 5;
const PULL_FIRES_AT = 0.5;
const CLICK_AFTER_DRAG_MS = 80;

/**
 * Dragging the lever down. Returns how far it is pulled (0..1), whether a drag is under way, and
 * the event props for the button. Releasing past half way pulls; a plain click or key press pulls too.
 */
export function useLever(onPull: (source: 'lever' | 'drag') => void) {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; pull: number; moved: boolean } | null>(null);
  const draggedAt = useRef(0);

  const letGo = () => {
    const ended = drag.current;
    drag.current = null;
    setDragging(false);
    setPull(0);
    return ended;
  };

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button) return;
      drag.current = { startY: event.clientY, pull: 0, moved: false };
      // Keep receiving moves when the pointer leaves the lever. Synthetic pointers can't be captured.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The drag still works while the pointer stays over the lever.
      }
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current;
      if (!current) return;
      const travelled = event.clientY - current.startY;
      if (Math.abs(travelled) > DRAG_STARTS_PX) current.moved = true;
      if (!current.moved) return;
      // The arm shortens over half the lever's height.
      current.pull = clamp(travelled / (event.currentTarget.offsetHeight * 0.5), 0, 1);
      setDragging(true);
      setPull(current.pull);
    },
    onPointerUp: () => {
      const ended = letGo();
      if (!ended?.moved) return;
      // The browser follows a drag with a click on the same button; that is not a second pull.
      draggedAt.current = Date.now();
      if (ended.pull > PULL_FIRES_AT) onPull('drag');
    },
    // The browser took the gesture over (a scroll, a call): put the lever back and do nothing.
    onPointerCancel: letGo,
    onClick: () => {
      if (Date.now() - draggedAt.current < CLICK_AFTER_DRAG_MS) return;
      onPull('lever');
    },
    // Holding Enter repeats the click; one press is one pull.
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
    },
  };

  return { pull, dragging, handlers };
}
