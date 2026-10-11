import { useEffect, useMemo, useRef, useState } from 'react';

import { chance, isCalm } from './motion';
import type { Timers } from './useTimers';

export type StarMode = 'hidden' | 'fly' | 'hold';

export type ShootingStar = {
  mode: StarMode;
  /** Starts the stars coming. Safe to call on every pull; only the first call counts. */
  start: () => void;
  /** Takes the current star away (caught, flown past, or burnt up by a pull) and schedules the next. */
  dismiss: () => void;
};

const FIRST_AFTER_MS = [20_000, 40_000];
const NEXT_AFTER_MS = [40_000, 80_000];
const RETRY_MS = 5_000;
const HOLD_MS = 6_000;
const between = ([min, max]: number[]) => min + chance() * (max - min);

/**
 * Now and then a star crosses the sky. It only appears when `mayAppear` says the moment is right;
 * otherwise it tries again shortly. With reduced motion it holds still for a few seconds instead.
 */
export function useShootingStar(timers: Timers, mayAppear: () => boolean): ShootingStar {
  const [mode, setMode] = useState<StarMode>('hidden');
  const live = useRef({
    started: false,
    showing: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    mayAppear,
  });

  useEffect(() => {
    live.current.mayAppear = mayAppear;
  }, [mayAppear]);

  const controls = useMemo(() => {
    const star = {
      schedule(ms: number) {
        clearTimeout(live.current.timer);
        live.current.timer = timers.later(star.appear, ms);
      },
      appear() {
        if (!live.current.mayAppear() || document.hidden) return star.schedule(RETRY_MS);
        live.current.showing = true;
        setMode(isCalm() ? 'hold' : 'fly');
        // A flying star ends with its animation; a held one is taken away after a while.
        if (isCalm()) live.current.timer = timers.later(star.dismiss, HOLD_MS);
      },
      dismiss() {
        if (!live.current.showing) return;
        live.current.showing = false;
        setMode('hidden');
        star.schedule(between(NEXT_AFTER_MS));
      },
      start() {
        if (live.current.started) return;
        live.current.started = true;
        star.schedule(between(FIRST_AFTER_MS));
      },
    };
    return { start: star.start, dismiss: star.dismiss };
  }, [timers]);

  return useMemo(() => ({ mode, ...controls }), [mode, controls]);
}
