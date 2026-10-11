import { type RefObject, useEffect, useRef } from 'react';

import { chance } from './motion';

const STAR_COLOURS = [
  '--cream',
  '--cream',
  '--cream',
  '--cream',
  '--cream',
  '--cream',
  '--night-accent',
  '--glow-plum',
];

/**
 * Scatters pixel stars over the section as two box-shadow layers that twinkle out of step.
 * They are placed after mount, at random, so the server renders an empty sky.
 */
export function useSky(section: RefObject<HTMLElement | null>) {
  const near = useRef<HTMLElement>(null);
  const far = useRef<HTMLElement>(null);

  useEffect(() => {
    const area = section.current;
    if (!area || typeof window.matchMedia !== 'function') return;
    const scatter = () => {
      const width = area.clientWidth;
      const height = window.innerHeight;
      const layers: string[][] = [[], []];
      const count = Math.round((width * height) / 16000);
      for (let i = 0; i < count; i++) {
        const x = Math.round(chance() * width);
        const y = Math.round(chance() * height);
        const spread = chance() < 0.2 ? 1 : 0;
        const colour = STAR_COLOURS[Math.floor(chance() * STAR_COLOURS.length)];
        const strength = Math.round(20 + chance() * 50);
        layers[i % 2].push(`${x}px ${y}px 0 ${spread}px color-mix(in srgb, var(${colour}) ${strength}%, transparent)`);
      }
      if (near.current) near.current.style.boxShadow = layers[0].join(',');
      if (far.current) far.current.style.boxShadow = layers[1].join(',');
    };
    scatter();
    window.addEventListener('resize', scatter);
    return () => window.removeEventListener('resize', scatter);
  }, [section]);

  return [near, far] as const;
}
