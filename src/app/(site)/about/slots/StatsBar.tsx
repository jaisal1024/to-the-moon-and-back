import type { Stats } from './engine';
import { Glyph } from './Pixel';
import { SPEAKER } from './pixels';
import styles from './slots.module.css';
import { WORDS } from './words';

// The rarer stats only appear once they have something to say.
const ALWAYS: (keyof Stats)[] = ['spins', 'jackpots', 'bestStreak'];
const ONCE_EARNED: (keyof Stats)[] = ['moonTrips', 'stars', 'loans'];

type Props = { stats: Stats; soundOn: boolean; onToggleSound: () => void };

/** The running totals beside the machine, and the sound toggle. */
export function StatsBar({ stats, soundOn, onToggleSound }: Props) {
  const rows = [...ALWAYS, ...ONCE_EARNED.filter((name) => stats[name] > 0)];
  return (
    <div className={styles.stats}>
      <dl data-testid="slot-stats">
        {rows.map((name) => (
          <div key={name}>
            <dt>{WORDS.stats[name]}</dt>
            <dd>{stats[name]}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className={styles.mute}
        aria-pressed={soundOn}
        aria-label={soundOn ? WORDS.labels.soundOn : WORDS.labels.soundOff}
        onClick={onToggleSound}
      >
        <Glyph d={soundOn ? SPEAKER.on : SPEAKER.off} width={9} height={7} />
      </button>
    </div>
  );
}
