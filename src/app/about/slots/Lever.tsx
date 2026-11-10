import { type CSSProperties, useRef } from 'react';

import { useReplay } from './motion';
import { Glyph } from './Pixel';
import { KNOB } from './pixels';
import styles from './slots.module.css';
import { useLever } from './useLever';
import { WORDS } from './words';

type Props = {
  /** Held down for a moment when a pull starts anywhere other than a drag. */
  down: boolean;
  /** Counter that makes the knob beckon. */
  nudge: number;
  onPull: (source: 'lever' | 'drag') => void;
};

/** The lever: a real button that can also be dragged down. */
export function Lever({ down, nudge, onPull }: Props) {
  const knob = useRef<SVGSVGElement>(null);
  const { pull, dragging, handlers } = useLever(onPull);
  useReplay(knob, nudge, 'nudge');

  return (
    <button
      type="button"
      className={styles.lever}
      aria-label={WORDS.labels.lever}
      data-testid="slot-lever"
      data-dragging={dragging || undefined}
      data-pulled={down || undefined}
      style={{ '--pull': dragging ? pull : down ? 1 : 0 } as CSSProperties}
      {...handlers}
    >
      <span className={styles.base} />
      <span className={styles.arm}>
        <Glyph ref={knob} className={styles.knob} d={KNOB} width={9} height={9} />
      </span>
    </button>
  );
}
