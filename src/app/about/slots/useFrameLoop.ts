import { useEffect, useState } from 'react';
import { clamp } from 'src/utils/math';

/** Called every frame while the loop runs. Returns true while it still has work to do. */
type Step = (now: number, dt: number) => boolean;

export type FrameLoop = {
  /** Registers a step and returns a function that removes it. */
  add: (step: Step) => () => void;
  /** Starts the loop if it is asleep, e.g. after giving a step new work. */
  wake: () => void;
};

function createLoop() {
  const steps = new Set<Step>();
  let frame = 0;
  let last = 0;
  let running = false;

  const loop = {
    add(step: Step) {
      steps.add(step);
      loop.wake();
      return () => {
        steps.delete(step);
      };
    },
    wake() {
      if (running && !frame) frame = requestAnimationFrame(loop.tick);
    },
    tick(now: number) {
      frame = 0;
      const dt = clamp(now - last, 0, 40);
      last = now;
      let busy = false;
      // Every step runs every frame; `some` would stop at the first busy one.
      steps.forEach((step) => {
        if (step(now, dt)) busy = true;
      });
      if (busy) loop.wake();
    },
    start() {
      running = true;
      loop.wake();
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
  return loop;
}

/**
 * The machine's single requestAnimationFrame loop. Everything that moves registers a step with
 * it; the loop sleeps whenever no step has work left, and stops for good on unmount.
 */
export function useFrameLoop(): FrameLoop {
  const [loop] = useState(createLoop);
  useEffect(() => {
    loop.start();
    return loop.stop;
  }, [loop]);
  return loop;
}
