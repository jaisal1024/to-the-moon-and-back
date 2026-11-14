import { STAR_HEAD } from './pixels';
import styles from './slots.module.css';
import type { StarMode } from './useShootingStar';
import { WORDS } from './words';

type Props = { mode: StarMode; onCatch: (star: Element) => void; onGone: () => void };

/** A star that crosses the sky. Catching it makes the next pull a sure thing. */
export function ShootingStar({ mode, onCatch, onGone }: Props) {
  return (
    <button
      type="button"
      className={styles.star}
      hidden={mode === 'hidden'}
      data-mode={mode}
      aria-label={WORDS.labels.star}
      onClick={(event) => onCatch(event.currentTarget)}
      onAnimationEnd={onGone}
    >
      <svg viewBox="0 0 15 7" shapeRendering="crispEdges" aria-hidden="true">
        <path className={styles.tailFar} d="M0 3h3v1h-3z" />
        <path className={styles.tail} d="M4 3h3v1h-3zM2 1h2v1h-2zM3 5h2v1h-2z" />
        <path d={STAR_HEAD} />
      </svg>
    </button>
  );
}
