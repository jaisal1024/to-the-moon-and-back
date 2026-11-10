import { useEffect, useMemo, useRef } from 'react';

import { type Stops, wrap } from './engine';
import { isCalm, replay } from './motion';
import type { FrameLoop } from './useFrameLoop';
import type { Sound } from './useSound';

/** What the reels show before the first pull: seven, rocket, full moon. A promise. */
export const OPENING_FACE: Stops = [2, 2, 6];
/** Cells rendered per reel: the strip plus two spare above and below, so the window never runs out. */
export const SPARE_CELLS = 2;

const SPEED = 0.032; // cells per millisecond at full spin
const WIND_UP = 0.012; // a small start the wrong way first
const BOUNCE = 1.3;
const RUN_UP = 5; // cells a reel travels while it eases into its stop
const TEASE_RUN_UP = 13;
const FIRST_STOP_MS = 620;
const STOP_GAP_MS = 360;
const TEASE_HOLD_MS = 380;

const backOut = (t: number) => 1 + (BOUNCE + 1) * Math.pow(t - 1, 3) + BOUNCE * Math.pow(t - 1, 2);
const crawlOut = (t: number) => 1 - Math.pow(1 - t, 5);

type Reel = {
  /** Position on the strip, in cells; the cell at `position` sits on the payline. */
  position: number;
  velocity: number;
  phase: 'still' | 'spinning' | 'landing';
  target: number;
  stopAt: number;
  tease: boolean;
  from: number;
  runUp: number;
  landedAt: number;
  duration: number;
  lastCell: number;
};

type Spin = {
  /** Hold the last reel back and crawl it in when the first two have set up a win. */
  tease: boolean;
  onTease?: () => void;
};

export type Reels = {
  /** Ref callbacks for the three strip elements, one per reel. */
  strips: ((element: HTMLElement | null) => void)[];
  /** Spins every reel and resolves when the last one has stopped on its stop. */
  spinTo: (stops: Stops, spin: Spin) => Promise<void>;
  /** The cell element `row` rows from the payline at a stop (-1 above, 1 below). */
  cell: (reel: number, stop: number, row: number) => Element | null;
};

/** Index, among a strip's rendered cells, of the cell `row` rows from the payline at `stop`. */
export const cellIndex = (stop: number, row: number) => stop + row + SPARE_CELLS;
/** Names one rendered cell, for marking it as a winner. */
export const cellKey = (reel: number, index: number) => `${reel}:${index}`;

const newReel = (stop: number): Reel => ({
  position: stop,
  velocity: 0,
  phase: 'still',
  target: stop,
  stopAt: 0,
  tease: false,
  from: stop,
  runUp: 0,
  landedAt: 0,
  duration: 0,
  lastCell: stop,
});

// Moves one reel on by a frame. Returns true on the frame it comes to rest.
function advance(reel: Reel, now: number, dt: number): boolean {
  if (reel.phase === 'spinning') {
    reel.velocity += (-SPEED - reel.velocity) * (1 - Math.exp(-dt / 110));
    reel.position += reel.velocity * dt;
    if (now < reel.stopAt) return false;
    // The blur hides a jump to a fixed run-up before the stop, so every landing eases the same way.
    reel.runUp = reel.tease ? TEASE_RUN_UP : RUN_UP;
    reel.from = reel.target + reel.runUp;
    reel.position = reel.from;
    reel.landedAt = now;
    reel.duration = ((reel.tease ? 4.4 : BOUNCE + 3) * reel.runUp) / SPEED;
    reel.lastCell = Math.floor(reel.position);
    reel.phase = 'landing';
    return false;
  }
  const t = Math.min(1, (now - reel.landedAt) / reel.duration);
  reel.position = reel.from - reel.runUp * (reel.tease ? crawlOut(t) : backOut(t));
  if (t < 1) return false;
  reel.position = reel.target;
  reel.phase = 'still';
  return true;
}

/**
 * The spinning itself: three strips moved by transform on the shared frame loop, with a wind-up,
 * staggered stops, an overshoot on landing and a slow crawl on the last reel when a win is on.
 * It only animates toward stops it is given; the engine has already decided them.
 */
export function useReels(loop: FrameLoop, blip: Sound['blip']): Reels {
  const strips = useRef<(HTMLElement | null)[]>([]);
  const reels = useRef<Reel[]>(OPENING_FACE.map(newReel));
  const spin = useRef<(Spin & { done: () => void }) | null>(null);

  const api = useMemo(() => {
    const place = (index: number) => {
      const strip = strips.current[index];
      const shift = -(wrap(reels.current[index].position) + 1);
      if (strip) strip.style.transform = `translateY(calc(var(--cell) * ${shift.toFixed(4)}))`;
    };
    const blur = (index: number, on: boolean) => strips.current[index]?.parentElement?.toggleAttribute('data-blur', on);

    const step = (now: number, dt: number) => {
      let moving = false;
      reels.current.forEach((reel, index) => {
        if (reel.phase === 'still') return;
        const landed = advance(reel, now, dt);
        place(index);
        if (reel.phase === 'landing') {
          const progress = (now - reel.landedAt) / reel.duration;
          if (progress > (reel.tease ? 0.12 : 0.3)) blur(index, false);
          // A tick for every symbol that crawls past during a tease.
          if (reel.tease && Math.floor(reel.position) !== reel.lastCell) {
            reel.lastCell = Math.floor(reel.position);
            blip(300 + (TEASE_RUN_UP - (reel.position - reel.target)) * 45, 0.04, 'square', 0.04);
          }
        }
        if (!landed) {
          moving = true;
          return;
        }
        blur(index, false);
        replay(strips.current[index]?.parentElement ?? null, 'thunk');
        blip(150 + index * 40, 0.07, 'square', 0.07);
        const last = reels.current[2];
        if (index === 1 && last.tease && last.phase === 'spinning') {
          last.stopAt = now + TEASE_HOLD_MS;
          spin.current?.onTease?.();
        }
      });
      if (!moving && spin.current) {
        const { done } = spin.current;
        spin.current = null;
        done();
      }
      return moving;
    };

    const spinTo: Reels['spinTo'] = (stops, { tease, onTease }) =>
      new Promise((done) => {
        if (isCalm()) {
          reels.current.forEach((reel, index) => {
            reel.position = reel.target = stops[index];
            place(index);
          });
          blip(220, 0.05);
          done();
          return;
        }
        const start = performance.now();
        reels.current.forEach((reel, index) => {
          const held = tease && index === 2;
          Object.assign(reel, {
            phase: 'spinning',
            velocity: WIND_UP,
            target: stops[index],
            tease: held,
            stopAt: held ? Infinity : start + FIRST_STOP_MS + index * STOP_GAP_MS,
          });
          blur(index, true);
        });
        spin.current = { tease, onTease, done };
        loop.wake();
      });

    const attach = OPENING_FACE.map((_, index) => (element: HTMLElement | null) => {
      strips.current[index] = element;
    });
    const cell: Reels['cell'] = (reel, stop, row) => strips.current[reel]?.children[cellIndex(stop, row)] ?? null;

    return { step, spinTo, strips: attach, cell };
  }, [loop, blip]);

  useEffect(() => loop.add(api.step), [loop, api]);

  return api;
}
