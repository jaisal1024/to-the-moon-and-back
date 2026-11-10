import type { RefObject } from 'react';

import { useReplay } from './motion';
import { Glyph, PixelText } from './Pixel';
import { COIN, STAR } from './pixels';
import styles from './slots.module.css';
import { WORDS } from './words';

type Props = {
  coinsRef: RefObject<HTMLDivElement | null>;
  /** The balance, for screen readers. */
  credits: number;
  /** The number on the counter, which may still be ticking toward the balance. */
  shown: number;
  falling: boolean;
  bump: number;
  streak: number;
  moonlit: boolean;
  freeSpins: number;
  lucky: boolean;
};

/** Credits, the current streak, and either the free spins left or a caught star. */
export function Hud({ coinsRef, credits, shown, falling, bump, streak, moonlit, freeSpins, lucky }: Props) {
  useReplay(coinsRef, bump, 'bump');
  return (
    <div className={styles.hud}>
      <div
        ref={coinsRef}
        className={styles.coins}
        role="img"
        aria-label={`${credits} ${WORDS.labels.credits}`}
        data-testid="slot-credits"
        data-falling={falling || undefined}
      >
        <Glyph className={styles.coin} d={COIN} width={7} height={7} />
        <PixelText text={String(shown)} />
      </div>
      <div className={styles.streak} aria-hidden="true">
        {streak > 1 && <PixelText key={streak} text={`${streak} ${WORDS.streak}`} />}
      </div>
      <div className={styles.extra} aria-hidden="true">
        {moonlit && <PixelText key={freeSpins} text={`${freeSpins} ${WORDS.freeLeft}`} />}
        {!moonlit && lucky && <Glyph d={STAR} width={7} height={7} />}
      </div>
    </div>
  );
}
