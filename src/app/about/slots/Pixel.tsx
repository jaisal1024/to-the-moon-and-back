import type { Ref } from 'react';

import type { SymbolId } from './engine';
import { ICON_SIZE, ICONS, write } from './pixels';
import styles from './slots.module.css';

/** A line of 5x7 pixel type. Decorative: the words are also given to screen readers elsewhere. */
export function PixelText({ text }: { text: string }) {
  const { d, width } = write(text);
  return (
    <svg viewBox={`0 0 ${width} 7`} shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** One of the eight reel symbols. */
export function Icon({ symbol }: { symbol: SymbolId }) {
  return (
    <svg viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} shapeRendering="crispEdges" aria-hidden="true">
      {ICONS[symbol].map((layer) => (
        <path key={layer.tone} className={styles[layer.tone]} d={layer.d} />
      ))}
    </svg>
  );
}

/** A single-colour pixel drawing from a path. */
type GlyphProps = { d: string; width: number; height: number; className?: string; ref?: Ref<SVGSVGElement> };

export function Glyph({ d, width, height, className, ref }: GlyphProps) {
  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
