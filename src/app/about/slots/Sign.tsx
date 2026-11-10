import type { Show } from './choreography';
import { PixelText } from './Pixel';
import styles from './slots.module.css';

/** The pixel sign above the reels. Each new line is keyed by its beat so its entrance replays. */
export function Sign({ sign }: { sign: Show['sign'] }) {
  return (
    <div className={styles.sign} data-tone={sign.tone} data-text={sign.text} aria-hidden="true">
      <PixelText key={sign.beat} text={sign.text} />
    </div>
  );
}
