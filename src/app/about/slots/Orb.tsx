import type { RefObject } from 'react';

import { METER_MAX } from './engine';
import { useReplay } from './motion';
import { orb, ORB_SIZE } from './pixels';
import styles from './slots.module.css';

type Props = {
  orbRef: RefObject<HTMLDivElement | null>;
  /** 0..METER_MAX: how far the moon has waxed toward the free spins. */
  meter: number;
  pop: number;
  jig: number;
};

/** The moon over the machine, which is also the meter. */
export function Orb({ orbRef, meter, pop, jig }: Props) {
  useReplay(orbRef, pop, 'pop');
  useReplay(orbRef, jig, 'jig');
  const moon = orb(meter / METER_MAX);
  return (
    <div ref={orbRef} className={styles.orb} aria-hidden="true">
      <svg viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`} shapeRendering="crispEdges">
        <path className={styles.orbDark} d={moon.dark} />
        <path className={styles.orbLit} d={moon.lit} />
      </svg>
    </div>
  );
}
