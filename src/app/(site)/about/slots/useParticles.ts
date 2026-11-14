import { type RefObject, useEffect, useMemo, useRef } from 'react';

import { chance, isCalm, pick } from './motion';
import type { FrameLoop } from './useFrameLoop';

export type Point = { x: number; y: number };

export type Particles = {
  /** Where an element sits on the canvas, as a fraction across and down it (centre by default). */
  spot: (element: Element, fx?: number, fy?: number) => Point;
  /** Coins thrown up from a point. */
  burst: (count: number, from: Point, power: number) => void;
  /** One coin with a given throw. */
  coin: (from: Point, vx: number, vy: number, size?: number) => void;
  /** Coins falling from the top of the stage for a while. */
  rain: (ms: number) => void;
  /** A square that drifts and shrinks: exhaust, star dust. */
  spark: (from: Point, vx: number, vy: number, life: number) => void;
};

type Particle = Point & {
  kind: 'coin' | 'spark';
  vx: number;
  vy: number;
  size: number;
  spin: number;
  turn: number;
  life: number;
  span: number;
  colour: string;
};

// The canvas inherits the machine's palette from these custom properties (slots.module.css).
const PALETTE = ['--glow-plum', '--night-accent', '--cream', '--reel-plum', '--reel-blue'];
const GRAVITY = 0.55;

function moveCoin(p: Particle, ctx: CanvasRenderingContext2D) {
  p.vy += GRAVITY;
  p.vx *= 0.99;
  p.x += p.vx;
  p.y += p.vy;
  p.spin += p.turn;
  // Coins flip edge-on as they fall.
  const width = Math.abs(Math.cos(p.spin)) * p.size + 1;
  ctx.fillRect(Math.round(p.x - width / 2), Math.round(p.y - p.size / 2), Math.round(width), Math.round(p.size));
}

function moveSpark(p: Particle, ctx: CanvasRenderingContext2D) {
  p.x += p.vx;
  p.y += p.vy;
  p.life--;
  const size = Math.ceil((p.size * p.life) / p.span);
  ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
}

/** Pixel coins and sparks on one canvas laid over the stage. Draws nothing when the machine is calm. */
export function useParticles(loop: FrameLoop, canvasRef: RefObject<HTMLCanvasElement | null>): Particles {
  const live = useRef({ particles: [] as Particle[], rainUntil: 0, colours: [] as string[], width: 0, height: 0 });

  const api = useMemo(() => {
    const colours = () => {
      const canvas = canvasRef.current;
      if (!live.current.colours.length && canvas) {
        const css = getComputedStyle(canvas);
        live.current.colours = PALETTE.map((name) => css.getPropertyValue(name).trim() || '#f9f4ec');
      }
      return live.current.colours;
    };
    const add = (
      kind: Particle['kind'],
      from: Point,
      vx: number,
      vy: number,
      size: number,
      life: number,
      colour: string,
    ) => {
      if (isCalm() || !canvasRef.current) return;
      live.current.particles.push({
        kind,
        ...from,
        vx,
        vy,
        size,
        life,
        span: life,
        colour,
        spin: chance() * 3,
        turn: (chance() - 0.5) * 0.4,
      });
      loop.wake();
    };
    const coin: Particles['coin'] = (from, vx, vy, size = 6 + chance() * 8) =>
      add('coin', from, vx, vy, size, 1, pick(colours()));
    const spark: Particles['spark'] = (from, vx, vy, life) =>
      add('spark', from, vx, vy, 4 + chance() * 6, life, pick(colours().slice(0, 3)));
    const burst: Particles['burst'] = (count, from, power) => {
      for (let i = 0; i < count; i++) {
        coin(
          { x: from.x + (chance() - 0.5) * 60, y: from.y },
          (chance() - 0.5) * 18 * power,
          (-5 - chance() * 15) * power,
        );
      }
    };
    const rain: Particles['rain'] = (ms) => {
      if (isCalm()) return;
      live.current.rainUntil = performance.now() + ms;
      loop.wake();
    };
    const spot: Particles['spot'] = (element, fx = 0.5, fy = 0.5) => {
      const box = element.getBoundingClientRect();
      const origin = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return { x: box.left - origin.left + box.width * fx, y: box.top - origin.top + box.height * fy };
    };
    return { spot, burst, coin, rain, spark };
  }, [loop, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // No matchMedia means no real canvas either (tests).
    const ctx = canvas && typeof window.matchMedia === 'function' ? canvas.getContext('2d') : null;
    if (!canvas || !ctx) return;

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      live.current.width = canvas.clientWidth;
      live.current.height = canvas.clientHeight;
      canvas.width = live.current.width * dpr;
      canvas.height = live.current.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener('resize', fit);

    const remove = loop.add((now) => {
      const state = live.current;
      const raining = now < state.rainUntil;
      if (raining) {
        for (let i = 0; i < 3; i++)
          api.coin({ x: chance() * state.width, y: -20 }, (chance() - 0.5) * 3, 2 + chance() * 6);
      }
      if (!state.particles.length) return raining;
      ctx.clearRect(0, 0, state.width, state.height);
      state.particles = state.particles.filter((p) => (p.kind === 'spark' ? p.life > 0 : p.y < state.height + 40));
      for (const p of state.particles) {
        ctx.fillStyle = p.colour;
        if (p.kind === 'spark') moveSpark(p, ctx);
        else moveCoin(p, ctx);
      }
      return true;
    });
    return () => {
      remove();
      window.removeEventListener('resize', fit);
    };
  }, [loop, api, canvasRef]);

  return api;
}
