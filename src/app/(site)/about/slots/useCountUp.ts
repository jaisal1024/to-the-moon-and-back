import { useEffect, useRef, useState } from 'react';

import { isCalm } from './motion';
import type { FrameLoop } from './useFrameLoop';

const TICK_MS = 45;

/**
 * A counter that ticks toward `target` instead of jumping, like coins dropping into a tray.
 * Returns the number to show and whether it is on its way down.
 */
export function useCountUp(loop: FrameLoop, target: number, onTick?: (shown: number) => void) {
  const [shown, setShown] = useState(target);
  const live = useRef({ shown: target, target, tickedAt: 0, onTick });

  useEffect(() => {
    live.current.target = target;
    live.current.onTick = onTick;
    loop.wake();
  }, [loop, target, onTick]);

  useEffect(
    () =>
      loop.add((now) => {
        const state = live.current;
        if (state.shown === state.target) return false;
        if (now - state.tickedAt < TICK_MS) return true;
        state.tickedAt = now;
        const gap = state.target - state.shown;
        state.shown = isCalm() ? state.target : state.shown + Math.sign(gap) * Math.ceil(Math.abs(gap) / 7);
        setShown(state.shown);
        if (gap > 0) state.onTick?.(state.shown);
        return state.shown !== state.target;
      }),
    [loop],
  );

  // With nothing animating (reduced motion, tests) the counter is simply the balance.
  const value = isCalm() ? target : shown;
  return { value, falling: value > target };
}
