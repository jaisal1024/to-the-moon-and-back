import { type KeyboardEvent, type PointerEvent, type RefObject, useEffect, useMemo, useRef } from 'react';
import { clamp } from 'src/utils/math';

import type { Aim } from './engine';
import { chance } from './motion';
import type { FrameLoop } from './useFrameLoop';
import type { Source } from './useShow';

/**
 * The target on the lever's travel (0 at rest, 1 fully down), by its centre. It waits at `rest`
 * and, while the lever is dragged, wanders between `low` and `high`. Letting go with the knob
 * within `reach` of the centre is a perfect pull.
 */
export const TARGET = { rest: 0.7, reach: 0.1, low: 0.3, high: 0.9 };
/** The share of the lever's height the knob travels: the arm shortens by this much (see .arm). */
const TRAVEL = 0.6;
/** The target wanders in legs: each one a random length, at a random speed (in travels per second). */
const LEG = { shortest: 0.1, longest: 0.4, slowest: 0.6, quickest: 1.6 };
/** After a leg the target is this likely to double back rather than carry on. */
const TURNS = 0.5;
/** How long the lever takes to travel down once when a key is held. */
const PUMP_MS = 560;
/** Each perfect pull in a row makes everything this much quicker, down to a floor. */
const QUICKER = 0.88;
const FASTEST = 0.5;

const DRAG_STARTS_PX = 5;
/** A drag let go above this is a change of mind, not a pull. */
const PULL_FIRES_AT = 0.2;
const CLICK_AFTER_DRAG_MS = 80;

const pace = (perfectsInARow: number) => Math.max(FASTEST, Math.pow(QUICKER, perfectsInARow));

type Leg = { from: number; to: number; start: number; end: number };

/**
 * One wander of the target, as a function from how long the lever has been held to where the
 * target's centre is. It sets off from its rest in a random direction; every leg has its own
 * length and speed, and it may double back at the end of any of them. The same random numbers
 * give the same wander.
 */
export function targetPath(random: () => number, perfectsInARow = 0): (heldMs: number) => number {
  const { rest, low, high } = TARGET;
  const legs: Leg[] = [];
  let heading = random() < 0.5 ? -1 : 1;

  const addLeg = () => {
    const last = legs.at(-1);
    const from = last ? last.to : rest;
    const start = last ? last.end : 0;
    if (last && random() < TURNS) heading = -heading;
    const room = () => (heading > 0 ? high - from : from - low);
    // No room left that way: it has to come back.
    if (room() < LEG.shortest) heading = -heading;
    const length = Math.min(room(), LEG.shortest + random() * (LEG.longest - LEG.shortest));
    const speed = (LEG.slowest + random() * (LEG.quickest - LEG.slowest)) / pace(perfectsInARow);
    legs.push({ from, to: from + heading * length, start, end: start + (length / speed) * 1000 });
  };

  return (heldMs) => {
    const at = Math.max(0, heldMs);
    while (!legs.length || (legs.at(-1) as Leg).end <= at) addLeg();
    const leg = legs.findLast((l) => l.start <= at) as Leg;
    return leg.from + (leg.to - leg.from) * ((at - leg.start) / (leg.end - leg.start));
  };
}

/** How far down the lever is after a key has been held for `heldMs`: it pumps down and back up, steadily. */
export function powerAt(heldMs: number, perfectsInARow = 0): number {
  const phase = (Math.max(0, heldMs) / (PUMP_MS * pace(perfectsInARow))) % 2;
  return phase < 1 ? phase : 2 - phase;
}

export const isOnTarget = (pull: number, target: number = TARGET.rest) => Math.abs(pull - target) <= TARGET.reach;

const isPullKey = (event: KeyboardEvent) => event.key === ' ' || event.key === 'Enter';

type Hold =
  | { by: 'drag'; since: number; startY: number; pull: number; moved: boolean; target: (heldMs: number) => number }
  /** A held key: nothing to drag, so the lever pumps by itself and the target waits. */
  | { by: 'key'; since: number };

type Options = {
  loop: FrameLoop;
  /** While the machine is busy the lever cannot be taken hold of. */
  busy: boolean;
  onPull: (source: Source, aim: Aim) => void;
};

/**
 * The lever as a pinball plunger. Take hold of the knob and the target starts wandering along the
 * lever, a different way every time; letting go with the knob on it is a perfect pull and letting
 * go off it is a fumble. A plain tap or click never aims, so it is an ordinary pull. From the
 * keyboard, holding Space or Enter pumps the lever past a target that stays put, and letting go
 * off it is only an ordinary pull. The lever has `touch-action: none`, so on a phone the
 * drag is never taken for a scroll.
 *
 * Returns a ref for the lever element (moved on the frame loop, without re-rendering), `drag`
 * (the lever's own pointer props) and `press(source)` (click and key props for anything that pulls).
 */
export function useLever({ loop, busy, onPull }: Options) {
  const lever = useRef<HTMLButtonElement>(null);
  const live = useRef({ busy, onPull, hold: null as Hold | null, perfects: 0, draggedAt: 0 });

  useEffect(() => {
    live.current.busy = busy;
    live.current.onPull = onPull;
  }, [busy, onPull]);

  const api = useMemo(() => {
    /** Where the knob and the target are right now. */
    const read = () => {
      const { hold, perfects } = live.current;
      if (!hold) return { pull: 0, target: TARGET.rest };
      const held = Date.now() - hold.since;
      return hold.by === 'drag'
        ? { pull: hold.pull, target: hold.target(held) }
        : { pull: powerAt(held, perfects), target: TARGET.rest };
    };
    const show = () => {
      const element = lever.current;
      if (!element) return;
      const held = live.current.hold !== null;
      const { pull, target } = read();
      element.style.setProperty('--pull', held ? pull.toFixed(3) : '0');
      element.style.setProperty('--target', target.toFixed(3));
      element.toggleAttribute('data-held', held);
      element.toggleAttribute('data-on-target', held && isOnTarget(pull, target));
    };
    const step = () => {
      if (!live.current.hold) return false;
      show();
      return true;
    };

    const take = (hold: Hold) => {
      if (live.current.busy || live.current.hold) return;
      live.current.hold = hold;
      show();
      loop.wake();
    };
    /** Ends the hold and returns where the knob and the target were. */
    const letGo = () => {
      const ended = { hold: live.current.hold, ...read() };
      live.current.hold = null;
      show();
      return ended;
    };
    const pull = (source: Source, aim: Aim) => {
      live.current.perfects = aim === 'hit' ? live.current.perfects + 1 : 0;
      live.current.onPull(source, aim);
    };

    const drag = {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button) return;
        const target = targetPath(chance, live.current.perfects);
        take({ by: 'drag', since: Date.now(), startY: event.clientY, pull: 0, moved: false, target });
        // Keep receiving moves when the pointer leaves the lever. Synthetic pointers can't be captured.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The drag still works while the pointer stays over the lever.
        }
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const { hold } = live.current;
        if (hold?.by !== 'drag') return;
        const travelled = event.clientY - hold.startY;
        if (Math.abs(travelled) > DRAG_STARTS_PX) hold.moved = true;
        // The knob stays under the finger. With no layout to measure (tests) any drag is a full one.
        if (!hold.moved) return;
        hold.pull = clamp(travelled / (event.currentTarget.offsetHeight * TRAVEL), 0, 1);
        show();
      },
      onPointerUp: () => {
        if (live.current.hold?.by !== 'drag') return;
        const { hold, pull: at, target } = letGo();
        // A tap never moved the lever: the click that follows is the pull.
        if (hold?.by !== 'drag' || !hold.moved) return;
        // The browser follows a drag with a click on the same button; that is not a second pull.
        live.current.draggedAt = Date.now();
        if (at >= PULL_FIRES_AT) pull('lever', isOnTarget(at, target) ? 'hit' : 'missed');
      },
      // The browser took the gesture over (a call, a system swipe): put the lever back and do nothing.
      onPointerCancel: letGo,
    };

    const press = (source: Source) => ({
      onBlur: letGo,
      onClick: () => {
        if (Date.now() - live.current.draggedAt < CLICK_AFTER_DRAG_MS) return;
        letGo();
        pull(source, 'none');
      },
      // The keys are handled here, so they neither scroll the page nor click the button as well.
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (!isPullKey(event)) return;
        event.preventDefault();
        if (!event.repeat) take({ by: 'key', since: Date.now() });
      },
      onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
        if (!isPullKey(event)) return;
        event.preventDefault();
        if (live.current.hold?.by !== 'key') return;
        const { pull: at, target } = letGo();
        pull(source, isOnTarget(at, target) ? 'hit' : 'none');
      },
    });

    return { step, drag, press };
  }, [loop]);

  useEffect(() => loop.add(api.step), [loop, api]);

  return { lever: lever as RefObject<HTMLButtonElement | null>, drag: api.drag, press: api.press };
}
