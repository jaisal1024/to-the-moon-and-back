import { type ComponentProps, type CSSProperties, type RefObject, useRef } from 'react';

import { useReplay } from './motion';
import { Glyph, PixelText } from './Pixel';
import { KNOB } from './pixels';
import styles from './slots.module.css';
import { TARGET } from './useLever';
import { WORDS } from './words';

type Props = {
  /** useLever moves the knob and the target through this while the lever is held. */
  leverRef: RefObject<HTMLButtonElement | null>;
  /** Slammed down for a moment as a pull starts. */
  down: boolean;
  /** Counter that makes the knob beckon. */
  nudge: number;
  /** Drag, click and key props from useLever. */
  handlers: ComponentProps<'button'>;
};

/** The lever: a real button that can also be dragged down. Let go on the target for a perfect pull. */
export function Lever({ leverRef, down, nudge, handlers }: Props) {
  const knob = useRef<SVGSVGElement>(null);
  useReplay(knob, nudge, 'nudge');

  return (
    <button
      ref={leverRef}
      type="button"
      className={styles.lever}
      aria-label={WORDS.labels.lever}
      data-testid="slot-lever"
      data-pulled={down || undefined}
      style={{ '--pull': down ? 1 : 0, '--target': TARGET.rest, '--reach': TARGET.reach } as CSSProperties}
      {...handlers}
    >
      <span className={styles.base} />
      <span className={styles.target}>
        <span className={styles.targetLabel}>
          <PixelText text={WORDS.target} />
        </span>
      </span>
      <span className={styles.arm}>
        <Glyph ref={knob} className={styles.knob} d={KNOB} width={9} height={9} />
      </span>
    </button>
  );
}
