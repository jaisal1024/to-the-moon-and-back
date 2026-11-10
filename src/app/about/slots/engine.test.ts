import { describe, expect, test } from 'vitest';

import {
  catchStar,
  COST,
  evaluate,
  FREE_MULTIPLIER,
  FREE_SPINS,
  fromSaved,
  type GameState,
  initialState,
  LOAN,
  METER_MAX,
  type OutcomeKind,
  PAYTABLE,
  REEL_LENGTH,
  REELS,
  type Rng,
  spin,
  STAR_BONUS,
  START_CREDITS,
  type Stops,
  symbolAt,
  type SymbolId,
} from './engine';

// mulberry32: a small seeded generator so every run of these tests sees the same pulls.
function seeded(seed: number): Rng {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// A random source that lands the reels on exactly these stops.
const landing = (stops: Stops): Rng => {
  const queue = stops.map((stop) => (stop + 0.5) / REEL_LENGTH);
  return () => queue.shift() ?? 0;
};

// Past the opening pull, with enough credits that nothing interferes.
const playing = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  opening: false,
  credits: 100,
  ...over,
});

const stopsFor = (symbols: [SymbolId, SymbolId, SymbolId], avoidRockets = true): Stops => {
  for (let a = 0; a < REEL_LENGTH; a++)
    for (let b = 0; b < REEL_LENGTH; b++)
      for (let c = 0; c < REEL_LENGTH; c++) {
        const stops: Stops = [a, b, c];
        const result = evaluate(stops);
        if (result.line.join() === symbols.join() && (!avoidRockets || result.kind !== 'launch')) return stops;
      }
  throw new Error(`no stops show ${symbols.join(' ')}`);
};

const allStops = (): Stops[] => {
  const all: Stops[] = [];
  for (let a = 0; a < REEL_LENGTH; a++)
    for (let b = 0; b < REEL_LENGTH; b++) for (let c = 0; c < REEL_LENGTH; c++) all.push([a, b, c]);
  return all;
};

describe('reels', () => {
  test('every reel has 16 stops, every symbol, and no symbol next to itself', () => {
    const symbols = Object.keys(PAYTABLE.triple).sort();
    for (const strip of REELS) {
      expect(strip).toHaveLength(REEL_LENGTH);
      expect([...new Set(strip)].sort()).toEqual(symbols);
      strip.forEach((symbol, i) => expect(symbol).not.toBe(strip[(i + 1) % REEL_LENGTH]));
    }
  });

  test('at most one rocket fits in a three-row window', () => {
    REELS.forEach((_, reel) => {
      for (let stop = 0; stop < REEL_LENGTH; stop++) {
        const inView = [-1, 0, 1].filter((row) => symbolAt(reel, stop, row) === 'rocket');
        expect(inView.length).toBeLessThanOrEqual(1);
      }
    });
  });

  test('symbolAt wraps around the strip', () => {
    expect(symbolAt(0, 0, -1)).toBe(REELS[0][REEL_LENGTH - 1]);
    expect(symbolAt(2, REEL_LENGTH - 1, 1)).toBe(REELS[2][0]);
  });
});

describe('paytable', () => {
  test.each(Object.entries(PAYTABLE.triple).filter(([symbol]) => symbol !== 'rocket'))(
    'three %s on the payline pays %i',
    (symbol, pays) => {
      const s = symbol as SymbolId;
      const before = playing();
      const { state, outcome } = spin(before, landing(stopsFor([s, s, s])));
      expect(outcome.kind).toBe(s === 'seven' ? 'sevens' : 'triple');
      expect(outcome.symbol).toBe(s);
      expect(outcome.payout).toBe(pays);
      expect(outcome.cells).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
      ]);
      expect(state.credits).toBe(before.credits - COST + pays);
      expect(state.stats.jackpots).toBe(1);
    },
  );

  test('777 is the top line', () => {
    expect(PAYTABLE.triple.seven).toBe(777);
    expect(Math.max(...Object.values(PAYTABLE.triple), PAYTABLE.launch, PAYTABLE.pair)).toBe(777);
  });

  test.each([[['wave', 'wave', 'camera']], [['wave', 'camera', 'wave']], [['camera', 'wave', 'wave']]] as [
    SymbolId,
    SymbolId,
    SymbolId,
  ][][])('a pair anywhere on the payline pays for the pull: %j', (line) => {
    const before = playing();
    const { state, outcome } = spin(before, landing(stopsFor(line)));
    expect(outcome.kind).toBe('pair');
    expect(outcome.symbol).toBe('wave');
    expect(outcome.payout).toBe(PAYTABLE.pair);
    expect(outcome.cells).toHaveLength(2);
    expect(state.credits).toBe(before.credits);
    expect(state.stats.jackpots).toBe(0);
  });

  test('three different symbols pay nothing', () => {
    const before = playing();
    const { state, outcome } = spin(before, landing(stopsFor(['wave', 'camera', 'palm'])));
    expect(outcome).toMatchObject({ kind: 'miss', symbol: null, payout: 0, cells: [] });
    expect(state.credits).toBe(before.credits - COST);
    expect(state.streak).toBe(0);
  });

  test('three rockets anywhere in view launch, even off the payline', () => {
    // Rockets sit at stop 7, stops 2 and 10, and stop 10: show them in three different rows.
    const stops: Stops = [8, 10, 9];
    expect([symbolAt(0, 8, -1), symbolAt(1, 10, 0), symbolAt(2, 9, 1)]).toEqual(['rocket', 'rocket', 'rocket']);
    const before = playing();
    const { state, outcome } = spin(before, landing(stops));
    expect(outcome.kind).toBe('launch');
    expect(outcome.cells).toEqual([
      [0, -1],
      [1, 0],
      [2, 1],
    ]);
    expect(outcome.payout).toBe(PAYTABLE.launch);
    expect(state.credits).toBe(before.credits - COST + PAYTABLE.launch);
    expect(state.stats.moonTrips).toBe(1);
    expect(state.stats.jackpots).toBe(1);
  });

  test('two rockets in view are not a launch', () => {
    const stops = allStops().find((s) => {
      const rockets = s.filter((stop, reel) => [-1, 0, 1].some((row) => symbolAt(reel, stop, row) === 'rocket'));
      return rockets.length === 2;
    });
    expect(evaluate(stops as Stops).kind).not.toBe('launch');
  });

  test('the documented odds and base return are exact', () => {
    const counts: Record<OutcomeKind, number> = { launch: 0, sevens: 0, triple: 0, pair: 0, miss: 0 };
    let paid = 0;
    for (const stops of allStops()) {
      const result = evaluate(stops);
      counts[result.kind]++;
      paid += result.base;
    }
    expect(counts).toEqual({ launch: 54, sevens: 4, triple: 93, pair: 1471, miss: 2474 });
    expect(paid).toBe(16758);
    expect(paid / (allStops().length * COST)).toBeCloseTo(0.818, 3);
  });
});

describe('teases and near misses', () => {
  test('two matching symbols on the first reels are a tease', () => {
    expect(evaluate(stopsFor(['wave', 'wave', 'camera'])).tease).toBe(true);
    expect(evaluate(stopsFor(['wave', 'camera', 'wave'])).tease).toBe(false);
    expect(evaluate(stopsFor(['wave', 'camera', 'palm'])).tease).toBe(false);
  });

  test('a pair whose third symbol stopped one row off the line is a near miss', () => {
    // Reel 3 has a wave at stop 2: stopping on 1 or 3 leaves it just above or below the payline.
    const [a, b] = stopsFor(['wave', 'wave', 'camera']);
    for (const c of [1, 3]) {
      const result = evaluate([a, b, c]);
      expect(result.kind).toBe('pair');
      expect(result.nearMiss).toBe(true);
    }
    // Stop 11 (book) has no wave beside it.
    expect(evaluate([a, b, 11]).nearMiss).toBe(false);
  });

  test('two rockets in view with the third just out of view is a near miss', () => {
    // Rockets: reel 1 stop 7, reel 2 stop 2, reel 3 stop 10. Two rows away is out of the window.
    for (const c of [8, 12]) {
      const result = evaluate([7, 2, c]);
      expect(result.kind).not.toBe('launch');
      expect(result.tease).toBe(true);
      expect(result.nearMiss).toBe(true);
    }
    expect(evaluate([7, 2, 2]).nearMiss).toBe(false);
  });

  test('a win is never a near miss', () => {
    for (const stops of allStops()) {
      const result = evaluate(stops);
      if (result.kind === 'launch' || result.kind === 'triple' || result.kind === 'sevens') {
        expect(result.nearMiss).toBe(false);
      }
    }
  });
});

describe('opening pull', () => {
  test.each([1, 2, 3, 4, 5])('is free and always lands three full moons (seed %i)', (seed) => {
    const before = initialState();
    const { state, outcome } = spin(before, seeded(seed));
    expect(outcome.line).toEqual(['moon', 'moon', 'moon']);
    expect(outcome).toMatchObject({ opening: true, cost: 0, loan: 0, multiplier: 1 });
    expect(outcome.payout).toBeGreaterThanOrEqual(PAYTABLE.triple.moon);
    expect(state.credits).toBe(START_CREDITS + outcome.payout);
    expect(state.opening).toBe(false);
    expect(state.stats).toMatchObject({ spins: 1, jackpots: 1 });
  });

  test('happens once: the next pull costs and is left to chance', () => {
    const rng = seeded(7);
    const first = spin(initialState(), rng);
    const second = spin(first.state, rng);
    expect(second.outcome).toMatchObject({ opening: false, cost: COST });
  });

  test('does not spend a waiting star or a free spin', () => {
    const { state, outcome } = spin({ ...initialState(), lucky: true, freeSpins: 2, meter: METER_MAX }, seeded(3));
    expect(outcome).toMatchObject({ usedStar: false, free: false });
    expect(state).toMatchObject({ lucky: true, freeSpins: 2, meter: METER_MAX });
  });
});

describe('moon meter and free spins', () => {
  const pair = () => landing(stopsFor(['wave', 'wave', 'camera']));
  const triple = () => landing(stopsFor(['palm', 'palm', 'palm']));
  const miss = () => landing(stopsFor(['wave', 'camera', 'palm']));

  test('a pair adds one, three of a kind adds two, a miss adds nothing', () => {
    expect(spin(playing(), pair()).state.meter).toBe(1);
    expect(spin(playing(), triple()).state.meter).toBe(2);
    expect(spin(playing({ meter: 3 }), miss()).state.meter).toBe(3);
  });

  test('777 and a launch fill it outright', () => {
    for (const rng of [landing(stopsFor(['seven', 'seven', 'seven'])), landing([7, 2, 10])]) {
      const { state, outcome } = spin(playing(), rng);
      expect(state).toMatchObject({ meter: METER_MAX, freeSpins: FREE_SPINS });
      expect(outcome.bonusStarted).toBe(true);
    }
  });

  test('filling the meter starts the free spins, which pay double, cost nothing and then reset it', () => {
    let state = playing({ meter: METER_MAX - 1 });
    let result = spin(state, pair());
    expect(result.outcome).toMatchObject({ bonusStarted: true, free: false, cost: COST });
    expect(result.state).toMatchObject({ meter: METER_MAX, freeSpins: FREE_SPINS });
    state = result.state;

    for (let n = FREE_SPINS; n > 0; n--) {
      const before = state.credits;
      result = spin(state, triple());
      expect(result.outcome).toMatchObject({
        free: true,
        cost: 0,
        multiplier: FREE_MULTIPLIER,
        payout: PAYTABLE.triple.palm * FREE_MULTIPLIER,
        bonusStarted: false,
        bonusEnded: n === 1,
      });
      expect(result.state.credits).toBe(before + PAYTABLE.triple.palm * FREE_MULTIPLIER);
      expect(result.state.freeSpins).toBe(n - 1);
      // Wins during the round do not feed the meter.
      expect(result.state.meter).toBe(n === 1 ? 0 : METER_MAX);
      state = result.state;
    }

    result = spin(state, miss());
    expect(result.outcome).toMatchObject({ free: false, cost: COST, multiplier: 1 });
  });

  test('the meter never overshoots', () => {
    const { state } = spin(playing({ meter: METER_MAX - 1 }), triple());
    expect(state.meter).toBe(METER_MAX);
  });
});

describe('shooting star', () => {
  test('catching one pays a little and arms the next pull', () => {
    const state = catchStar(playing({ credits: 10 }));
    expect(state).toMatchObject({ credits: 10 + STAR_BONUS, lucky: true });
    expect(state.stats.stars).toBe(1);
  });

  test.each([11, 12, 13, 14, 15, 16, 17, 18])('the armed pull is always a jackpot (seed %i)', (seed) => {
    const rng = seeded(seed);
    const { state, outcome } = spin(catchStar(playing()), rng);
    expect(outcome.usedStar).toBe(true);
    expect(outcome.line[0]).toBe(outcome.line[1]);
    expect(outcome.line[1]).toBe(outcome.line[2]);
    expect(['seven', 'rocket']).not.toContain(outcome.line[0]);
    expect(['triple', 'launch']).toContain(outcome.kind);
    expect(outcome.cost).toBe(COST);
    expect(state.lucky).toBe(false);
    expect(spin(state, rng).outcome.usedStar).toBe(false);
  });
});

describe('moon loan', () => {
  test.each([0, 1, COST - 1])('with %i credits the moon lends before the pull', (credits) => {
    const { state, outcome } = spin(playing({ credits }), landing(stopsFor(['wave', 'camera', 'palm'])));
    expect(outcome).toMatchObject({ loan: LOAN, cost: COST, payout: 0 });
    expect(state.credits).toBe(credits + LOAN - COST);
    expect(state.stats.loans).toBe(1);
  });

  test('exactly enough credits needs no loan', () => {
    const { state, outcome } = spin(playing({ credits: COST }), landing(stopsFor(['wave', 'camera', 'palm'])));
    expect(outcome.loan).toBe(0);
    expect(state.credits).toBe(0);
  });

  test('free spins never borrow', () => {
    const { outcome } = spin(playing({ credits: 0, freeSpins: 1, meter: METER_MAX }), seeded(1));
    expect(outcome).toMatchObject({ loan: 0, cost: 0, free: true });
  });
});

describe('streaks and stats', () => {
  test('consecutive wins build a streak and a miss ends it', () => {
    let state = playing();
    for (let i = 1; i <= 3; i++) {
      state = spin(state, landing(stopsFor(['wave', 'wave', 'camera']))).state;
      expect(state.streak).toBe(i);
    }
    state = spin(state, landing(stopsFor(['wave', 'camera', 'palm']))).state;
    expect(state.streak).toBe(0);
    expect(state.stats).toMatchObject({ spins: 4, bestStreak: 3, jackpots: 0 });
  });

  test('spin is pure: it does not touch the state it is given', () => {
    const before = playing();
    const copy = structuredClone(before);
    spin(before, seeded(1));
    expect(before).toEqual(copy);
  });

  test('the same seed replays the same game', () => {
    const play = () => {
      const rng = seeded(99);
      let state = initialState();
      const kinds: string[] = [];
      for (let i = 0; i < 200; i++) {
        const result = spin(state, rng);
        state = result.state;
        kinds.push(result.outcome.kind);
      }
      return { state, kinds };
    };
    expect(play()).toEqual(play());
  });

  test('a random source that misbehaves still gives valid stops', () => {
    for (const value of [1, -0.2, 5]) {
      const { outcome } = spin(playing(), () => value);
      outcome.stops.forEach((stop) => {
        expect(stop).toBeGreaterThanOrEqual(0);
        expect(stop).toBeLessThan(REEL_LENGTH);
      });
    }
  });
});

describe('long run', () => {
  test('10,000 pulls reconcile, never go negative and always show what they paid for', () => {
    const rng = seeded(2026);
    let state = initialState();
    let stars = 0;
    for (let i = 0; i < 10_000; i++) {
      // Catch a star now and then so the armed pull is part of the mix.
      if (i % 97 === 50 && !state.lucky) {
        state = catchStar(state);
        stars++;
      }
      const before = state;
      const { state: after, outcome } = spin(before, rng);

      expect(after.credits).toBe(before.credits + outcome.loan - outcome.cost + outcome.payout);
      expect(after.credits).toBeGreaterThanOrEqual(0);
      expect(outcome.loan === LOAN || outcome.loan === 0).toBe(true);
      if (outcome.loan) expect(before.credits).toBeLessThan(COST);

      // The payout is exactly what the visible window is worth.
      const seen = evaluate(outcome.stops);
      expect(outcome.kind).toBe(seen.kind);
      expect(outcome.payout).toBe(seen.base * outcome.multiplier);
      expect(outcome.line).toEqual(outcome.stops.map((stop, reel) => REELS[reel][stop]));

      expect(after.meter).toBeGreaterThanOrEqual(0);
      expect(after.meter).toBeLessThanOrEqual(METER_MAX);
      expect(after.freeSpins > 0).toBe(after.meter === METER_MAX);
      expect(after.stats.spins).toBe(before.stats.spins + 1);
      state = after;
    }
    expect(state.stats.stars).toBe(stars);
    expect(state.stats.spins).toBe(10_000);
  });

  test('the long-run return sits just above break-even, as documented', () => {
    for (const seed of [1, 2, 3]) {
      const rng = seeded(seed);
      let state = playing();
      let cost = 0;
      let paid = 0;
      let rounds = 0;
      let paidPulls = 0;
      for (let i = 0; i < 300_000; i++) {
        const result = spin(state, rng);
        state = result.state;
        cost += result.outcome.cost;
        paid += result.outcome.payout;
        if (result.outcome.cost) paidPulls++;
        if (result.outcome.bonusStarted) rounds++;
      }
      const rtp = paid / cost;
      expect(rtp).toBeGreaterThan(1.05);
      expect(rtp).toBeLessThan(1.16);
      expect(paidPulls / rounds).toBeGreaterThan(16);
      expect(paidPulls / rounds).toBeLessThan(18.5);
    }
  });

  test('a dry spell is survivable: the loan keeps a losing player in the game', () => {
    // A source that never matches anything: the balance only ever falls, and the loans catch it.
    const never = () => landing(stopsFor(['wave', 'camera', 'palm']));
    let state = playing({ credits: 12 });
    for (let i = 0; i < 500; i++) {
      state = spin(state, never()).state;
      expect(state.credits).toBeGreaterThanOrEqual(0);
    }
    expect(state.stats.loans).toBeGreaterThan(30);
  });
});

describe('saving', () => {
  test('a saved game comes back exactly as it was', () => {
    const rng = seeded(5);
    let state = initialState();
    for (let i = 0; i < 40; i++) state = spin(state, rng).state;
    const restored = fromSaved(JSON.parse(JSON.stringify(state)));
    expect(restored).toEqual(state);
  });

  test.each([null, undefined, 'nope', 42])('rubbish in storage gives a fresh game: %j', (saved) => {
    expect(fromSaved(saved)).toEqual(initialState());
  });

  test.each([[], {}, { credits: 'lots' }, { credits: NaN, stats: 'x' }])(
    'a mangled save is a fresh game that has had its opening pull: %j',
    (saved) => {
      expect(fromSaved(saved)).toEqual({ ...initialState(), opening: false });
    },
  );

  test('the opening pull is owed once per visitor, not once per visit', () => {
    const rng = seeded(8);
    // A new visitor who leaves before pulling still gets it next time.
    expect(fromSaved(JSON.parse(JSON.stringify(initialState()))).opening).toBe(true);
    // Once pulled, it is gone for good: the next visit opens with an ordinary pull.
    const opened = spin(initialState(), rng);
    expect(opened.outcome.opening).toBe(true);
    const nextVisit = fromSaved(JSON.parse(JSON.stringify(opened.state)));
    expect(nextVisit.opening).toBe(false);
    const { state, outcome } = spin(nextVisit, rng);
    expect(outcome).toMatchObject({ opening: false, cost: COST });
    // The jackpot it paid was counted exactly once.
    expect(state.stats.jackpots - (outcome.kind === 'miss' || outcome.kind === 'pair' ? 0 : 1)).toBe(1);
  });

  test('a save from before the opening pull was recorded counts as having had it', () => {
    const old = { credits: 116, meter: 2, freeSpins: 0, lucky: false, stats: { spins: 1, jackpots: 1 } };
    expect(fromSaved(old)).toMatchObject({ opening: false, credits: 116, meter: 2 });
  });

  test('out-of-range values are pulled back into range', () => {
    const state = fromSaved({
      credits: -50,
      meter: 99,
      freeSpins: 0,
      lucky: 'yes',
      stats: { spins: 3.7, jackpots: -1, bestStreak: Infinity, loans: 1e12 },
    });
    expect(state.credits).toBe(0);
    expect(state.meter).toBe(METER_MAX - 1);
    expect(state.lucky).toBe(false);
    expect(state.stats).toMatchObject({ spins: 3, jackpots: 0, bestStreak: 0, moonTrips: 0, stars: 0 });
    expect(Number.isSafeInteger(state.stats.loans)).toBe(true);
    // And it is still playable.
    expect(spin(state, seeded(1)).state.credits).toBeGreaterThanOrEqual(0);
  });

  test('a save made mid-round keeps the meter full', () => {
    expect(fromSaved({ credits: 10, meter: 2, freeSpins: 2 })).toMatchObject({ meter: METER_MAX, freeSpins: 2 });
    expect(fromSaved({ credits: 10, meter: METER_MAX, freeSpins: 0 }).meter).toBe(METER_MAX - 1);
  });
});
