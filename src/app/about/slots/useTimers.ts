import { useEffect, useMemo, useRef } from 'react';

import { isCalm } from './motion';

export type Timers = {
  /** setTimeout that is cancelled when the machine unmounts. */
  later: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> | undefined;
  /** A pause in a script. Short when the machine is calm, and it never ends after unmount. */
  wait: (ms: number) => Promise<void>;
};

const CALM_PAUSE = 400;

export function useTimers(): Timers {
  const pending = useRef(new Set<ReturnType<typeof setTimeout>>());
  const mounted = useRef(false);

  useEffect(() => {
    const ids = pending.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      ids.forEach(clearTimeout);
      ids.clear();
    };
  }, []);

  return useMemo(() => {
    const later: Timers['later'] = (fn, ms) => {
      // A script still unwinding after unmount must not start new timers.
      if (!mounted.current) return undefined;
      const id = setTimeout(() => {
        pending.current.delete(id);
        fn();
      }, ms);
      pending.current.add(id);
      return id;
    };
    const wait: Timers['wait'] = (ms) =>
      new Promise((resolve) => later(resolve, isCalm() ? Math.min(ms, CALM_PAUSE) : ms));
    return { later, wait };
  }, []);
}
