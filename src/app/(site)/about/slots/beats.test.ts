import { expect, test } from 'vitest';

import { beats, type Round } from './beats';
import {
  COST,
  type GameState,
  initialState,
  LOAN,
  METER_MAX,
  PAYTABLE,
  REEL_LENGTH,
  type Rng,
  spin,
  type Stops,
} from './engine';

const landing = (stops: Stops): Rng => {
  const queue = stops.map((stop) => (stop + 0.5) / REEL_LENGTH);
  return () => queue.shift() ?? 0;
};
const PAIR: Stops = [1, 0, 3];
const MISS: Stops = [1, 3, 0];

function round(over: Partial<GameState>, stops: Stops): Round {
  const before = { ...initialState(), opening: false, credits: 100, ...over };
  const { state: after, outcome } = spin(before, landing(stops));
  return { before, after, outcome };
}

test('pulled: the pull is paid for and counted, and nothing else has moved', () => {
  const r = round({ meter: 3 }, PAIR);
  expect(beats.pulled(r)).toEqual({ ...r.before, credits: 100 - COST, stats: { ...r.before.stats, spins: 1 } });
});

test('lent, then pulled: the loan arrives before the pull is paid for', () => {
  const r = round({ credits: 2 }, MISS);
  expect(beats.lent(r)).toMatchObject({ credits: 2 + LOAN, stats: { loans: 1, spins: 0 } });
  expect(beats.pulled(r)).toMatchObject({ credits: 2 + LOAN - COST, stats: { loans: 1, spins: 1 } });
});

test('landed: an ordinary result is simply the new state', () => {
  const r = round({ meter: 3 }, PAIR);
  expect(beats.landed(r)).toEqual(r.after);
  expect(r.after).toMatchObject({ credits: 100 - COST + PAYTABLE.pair, meter: 4 });
});

test('landed: the pull that fills the moon pays first; the moon turns full a beat later', () => {
  const r = round({ meter: METER_MAX - 1 }, PAIR);
  expect(r.outcome.bonusStarted).toBe(true);
  expect(beats.landed(r)).toEqual({ ...r.after, meter: METER_MAX - 1, freeSpins: 0 });
});

test('a free spin counts down when pulled, and the moon stays full until it sets', () => {
  const r = round({ meter: METER_MAX, freeSpins: 1 }, MISS);
  expect(r.outcome).toMatchObject({ free: true, bonusEnded: true });
  expect(beats.pulled(r)).toMatchObject({ credits: 100, freeSpins: 0, meter: METER_MAX });
  expect(beats.landed(r)).toMatchObject({ meter: METER_MAX, freeSpins: 0 });
  expect(r.after.meter).toBe(0);
});
