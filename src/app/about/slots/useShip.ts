import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { clamp } from 'src/utils/math';

import { chance } from './motion';
import type { FrameLoop } from './useFrameLoop';
import type { Particles, Point } from './useParticles';

type Flight = {
  /** The cell the rocket lifts off from and lands back on. */
  pad: Element;
  moon: Element;
  /** Called as the ship reaches the moon. */
  onMoon: () => void;
  /** Called as it turns for home. */
  onReturn: () => void;
};

export type Ship = {
  shipRef: RefObject<HTMLDivElement | null>;
  /** True while the ship is off its reel, so the cell it left can be shown empty. */
  flying: boolean;
  /** Flies pad -> around the moon -> back to the pad, tail first. Resolves on touchdown. */
  fly: (flight: Flight) => Promise<void>;
};

type Tween = { start: number; ms: number; frame: (t: number) => void; done: () => void };

const ASCENT_MS = 2500;
const FLIP_MS = 380;
const DESCENT_MS = 900;

// A point `t` (0..1) of the way along a Catmull-Rom curve through the waypoints.
function along(points: Point[], t: number): Point {
  const last = points.length - 1;
  const f = clamp(t, 0, 0.9999) * last;
  const i = Math.floor(f);
  const u = f - i;
  const [p0, p1, p2, p3] = [points[Math.max(0, i - 1)], points[i], points[i + 1], points[Math.min(last, i + 2)]];
  const curve = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return { x: curve(p0.x, p1.x, p2.x, p3.x), y: curve(p0.y, p1.y, p2.y, p3.y) };
}

/** The rocket's trip: three tweens on the frame loop, leaving a trail of sparks. */
export function useShip(loop: FrameLoop, particles: Particles): Ship {
  const shipRef = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(false);
  const tweens = useRef<Tween[]>([]);

  useEffect(
    () =>
      loop.add((now) => {
        const finished = tweens.current.filter((tween) => {
          const t = clamp((now - tween.start) / tween.ms, 0, 1);
          tween.frame(t);
          return t >= 1;
        });
        tweens.current = tweens.current.filter((tween) => !finished.includes(tween));
        finished.forEach((tween) => tween.done());
        return tweens.current.length > 0;
      }),
    [loop],
  );

  const fly = useMemo(() => {
    const tween = (ms: number, frame: Tween['frame']) =>
      new Promise<void>((done) => {
        tweens.current.push({ start: performance.now(), ms, frame, done });
        loop.wake();
      });

    return async ({ pad, moon, onMoon, onReturn }: Flight) => {
      const ship = shipRef.current;
      if (!ship) return;
      const home = particles.spot(pad);
      const orbit = particles.spot(moon);
      const radius = moon.getBoundingClientRect().width * 1.05;
      setFlying(true);
      // The ship is drawn at 70% of a cell (slots.module.css); it is still hidden, so measure the pad.
      const size = pad.getBoundingClientRect().width * 0.7;
      const route: Point[] = [
        home,
        { x: home.x, y: home.y - (home.y - orbit.y) * 0.45 },
        { x: orbit.x + radius * 1.1, y: orbit.y + radius * 0.5 },
        { x: orbit.x + radius * 0.75, y: orbit.y - radius * 0.55 },
        { x: orbit.x, y: Math.max(size * 0.45, orbit.y - radius) },
        { x: orbit.x - radius * 0.95, y: orbit.y - radius * 0.2 },
        { x: orbit.x - radius * 0.9, y: orbit.y + radius * 0.8 },
        { x: home.x, y: orbit.y + radius * 1.5 },
      ];
      const place = (at: Point, degrees: number, scale: number) => {
        ship.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) rotate(${degrees.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      };
      const exhaust = (at: Point, degrees: number, count: number, scale: number) => {
        const angle = ((degrees + 90) * Math.PI) / 180;
        const tail = {
          x: at.x + Math.cos(angle) * size * 0.45 * scale,
          y: at.y + Math.sin(angle) * size * 0.45 * scale,
        };
        for (let i = 0; i < count; i++) {
          particles.spark(
            tail,
            Math.cos(angle) * 3 + (chance() - 0.5) * 2.4,
            Math.sin(angle) * 3 + (chance() - 0.5) * 2.4,
            22 + Math.floor(chance() * 16),
          );
        }
      };

      let heading = 0;
      let reachedMoon = false;
      place(home, 0, 1);
      await tween(ASCENT_MS, (t) => {
        // A slow lift-off, then steady along the route.
        const travelled = t < 0.35 ? Math.pow(t / 0.35, 2) * 0.22 : 0.22 + ((t - 0.35) / 0.65) * 0.78;
        const at = along(route, travelled);
        const ahead = along(route, travelled + 0.004);
        const scale = 1 + 0.45 * Math.sin(Math.PI * Math.min(1, travelled * 1.15));
        heading = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI + 90;
        place(at, heading, scale);
        exhaust(at, heading, 2, scale);
        if (!reachedMoon && travelled > 0.5) {
          reachedMoon = true;
          onMoon();
        }
      });

      // Flip upright and come down tail first.
      const top = route[route.length - 1];
      const tilt = heading > 180 ? heading - 360 : heading;
      await tween(FLIP_MS, (t) => place(top, tilt * (1 - t) * (1 - t), 1.2 - 0.2 * t));
      onReturn();
      await tween(DESCENT_MS, (t) => {
        const at = { x: home.x, y: top.y + (home.y - top.y) * (1 - Math.pow(1 - t, 2.4)) };
        place(at, 0, 1);
        if (t < 0.92) exhaust(at, 0, t > 0.5 ? 3 : 1, 1);
      });
      setFlying(false);
    };
  }, [loop, particles]);

  return { shipRef, flying, fly };
}
