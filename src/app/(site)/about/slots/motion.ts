import { type RefObject, useEffect } from 'react';

let reduceQuery: MediaQueryList | undefined;

/**
 * True when the machine should hold still: the visitor prefers reduced motion, or there is no
 * matchMedia at all (tests). Calm reels snap to their result and nothing shakes, rains or flies.
 */
export function isCalm(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  reduceQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reduceQuery.matches;
}

/** Decoration only (stars, coins, which quip). The reels never use this. */
export const chance = () => Math.random();
export const pick = <T>(items: readonly T[]): T => items[Math.floor(chance() * items.length)];

const SPRING = 'cubic-bezier(0.2, 1.9, 0.4, 1)';

// One-shot moves, played with the Web Animations API so they can be replayed without touching the DOM tree.
const MOVES = {
  shake: {
    keyframes: [
      { transform: 'none' },
      { transform: 'translate(-7px, 3px) rotate(-0.7deg)', offset: 0.2 },
      { transform: 'translate(7px, -3px) rotate(0.7deg)', offset: 0.4 },
      { transform: 'translate(-4px, 1px)', offset: 0.6 },
      { transform: 'translate(3px, 0)', offset: 0.8 },
      { transform: 'none' },
    ],
    options: { duration: 400, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' },
  },
  thunk: {
    keyframes: [{ transform: 'none' }, { transform: 'translateY(5px)', offset: 0.35 }, { transform: 'none' }],
    options: { duration: 220, easing: 'cubic-bezier(0.3, 1.8, 0.5, 1)' },
  },
  pop: {
    keyframes: [{ transform: 'none' }, { transform: 'scale(1.28) rotate(-6deg)', offset: 0.4 }, { transform: 'none' }],
    options: { duration: 500, easing: SPRING },
  },
  jig: {
    keyframes: [{ transform: 'rotate(-9deg) translateX(-3px)' }, { transform: 'rotate(9deg) translateX(3px)' }],
    options: { duration: 120, iterations: 9, direction: 'alternate' },
  },
  bump: {
    keyframes: [{ transform: 'none' }, { transform: 'scale(1.25)', offset: 0.4 }, { transform: 'none' }],
    options: { duration: 350, easing: SPRING },
  },
  nudge: {
    keyframes: [
      { transform: 'translate(-50%, -62%)' },
      { transform: 'translate(-50%, -42%)', offset: 0.3 },
      { transform: 'translate(-50%, -66%)', offset: 0.6 },
      { transform: 'translate(-50%, -62%)' },
    ],
    options: { duration: 900, iterations: 2, easing: 'ease-in-out' },
  },
  flash: {
    keyframes: [{ opacity: 0.55 }, { opacity: 0.15, offset: 0.5 }, { opacity: 0.35, offset: 0.75 }, { opacity: 0 }],
    options: { duration: 500, easing: 'steps(4)' },
  },
} satisfies Record<string, { keyframes: Keyframe[]; options: KeyframeAnimationOptions }>;

export type Move = keyof typeof MOVES;

/** Plays a one-shot move on an element, unless the machine is calm. */
export function replay(element: Element | null, move: Move, times = 1) {
  if (!element || isCalm() || typeof element.animate !== 'function') return;
  const { keyframes, options } = MOVES[move];
  const iterations = ('iterations' in options ? options.iterations : 1) * times;
  element.animate(keyframes, { ...options, iterations });
}

/** Replays a move each time `beat` changes to a new non-zero count. */
export function useReplay(ref: RefObject<Element | null>, beat: number, move: Move, times = 1) {
  useEffect(() => {
    if (beat) replay(ref.current, move, times);
  }, [ref, beat, move, times]);
}
