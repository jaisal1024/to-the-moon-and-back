import { type GameState, METER_MAX, type Outcome } from './engine';

/** One pull, as the engine decided it. */
export type Round = { before: GameState; after: GameState; outcome: Outcome };

/**
 * What the screen may show at each beat of a pull. The engine settles the whole pull at once;
 * these are the in-between states the counters pass through while it is being revealed.
 */
export const beats = {
  /** The moon has lent some credits, before the pull is paid for. */
  lent: ({ before, after, outcome }: Round): GameState => ({
    ...before,
    credits: before.credits + outcome.loan,
    stats: { ...before.stats, loans: after.stats.loans },
  }),
  /** The lever is down: the pull is paid for and counted, nothing has landed. */
  pulled: ({ before, after, outcome }: Round): GameState => ({
    ...before,
    credits: before.credits + outcome.loan - outcome.cost,
    freeSpins: outcome.free ? before.freeSpins - 1 : before.freeSpins,
    stats: { ...before.stats, spins: after.stats.spins, loans: after.stats.loans },
  }),
  /** The reels have stopped and paid. The moon turning full, or setting, is still to come. */
  landed: ({ before, after, outcome }: Round): GameState => ({
    ...after,
    meter: outcome.bonusStarted ? Math.max(before.meter, METER_MAX - 1) : outcome.bonusEnded ? METER_MAX : after.meter,
    freeSpins: outcome.bonusStarted ? 0 : after.freeSpins,
  }),
};
