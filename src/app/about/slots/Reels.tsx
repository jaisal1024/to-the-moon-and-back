import type { CSSProperties, KeyboardEvent, RefObject } from 'react';

import type { Show } from './choreography';
import { REEL_LENGTH, REELS, wrap } from './engine';
import { Icon, PixelText } from './Pixel';
import styles from './slots.module.css';
import { cellKey, OPENING_FACE, type Reels as ReelMotion, SPARE_CELLS } from './useReels';
import { WORDS } from './words';

const BULBS_PER_SIDE = 12;
// Bulbs sit at fixed fractions around the window, clockwise from the top left.
const BULBS = [
  ...Array.from({ length: BULBS_PER_SIDE }, (_, i) => [i / BULBS_PER_SIDE, 0]),
  ...Array.from({ length: BULBS_PER_SIDE }, (_, i) => [1, i / BULBS_PER_SIDE]),
  ...Array.from({ length: BULBS_PER_SIDE }, (_, i) => [1 - i / BULBS_PER_SIDE, 1]),
  ...Array.from({ length: BULBS_PER_SIDE }, (_, i) => [0, 1 - i / BULBS_PER_SIDE]),
];
// Strip positions for every rendered cell: the whole strip plus the spares at each end.
const CELLS = Array.from({ length: REEL_LENGTH + SPARE_CELLS * 2 }, (_, i) => wrap(i - SPARE_CELLS));

type Props = {
  windowRef: RefObject<HTMLDivElement | null>;
  strips: ReelMotion['strips'];
  hits: Show['hits'];
  /** A cell whose rocket is off flying. */
  away: string | null;
  floats: Show['floats'];
  onPull: () => void;
};

/** The window onto the three reels, ringed with bulbs. Clicking or tapping it pulls the lever. */
export function Reels({ windowRef, strips, hits, away, floats, onPull }: Props) {
  // Only reached with focus on the reels, so the page keeps its own space-to-scroll.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) onPull();
  };

  return (
    <div
      ref={windowRef}
      className={styles.window}
      role="button"
      tabIndex={0}
      aria-label={WORDS.labels.reels}
      // A launch counts rockets in any row, so every row lights up.
      data-lit={hits?.kind === 'launch' || undefined}
      onClick={onPull}
      onKeyDown={onKeyDown}
    >
      <div className={styles.bulbs} aria-hidden="true">
        {BULBS.map(([x, y], i) => (
          <i
            key={i}
            className={styles.bulb}
            style={{ 'left': `${x * 100}%`, 'top': `${y * 100}%`, '--i': i, '--odd': i % 2 } as CSSProperties}
          />
        ))}
      </div>
      {REELS.map((symbols, reel) => (
        <div key={reel} className={styles.reel}>
          <div
            ref={strips[reel]}
            className={styles.strip}
            style={{ transform: `translateY(calc(var(--cell) * ${-(OPENING_FACE[reel] + 1)}))` }}
          >
            {CELLS.map((position, index) => {
              const key = cellKey(reel, index);
              return (
                <div
                  key={key}
                  className={styles.cell}
                  data-symbol={symbols[position]}
                  data-hit={hits?.cells.includes(key) ? hits.kind : undefined}
                  data-away={away === key || undefined}
                >
                  <Icon symbol={symbols[position]} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {floats.map((float) => (
        <div key={float.id} className={styles.float} data-big={float.big || undefined} aria-hidden="true">
          <PixelText text={float.text} />
        </div>
      ))}
    </div>
  );
}
