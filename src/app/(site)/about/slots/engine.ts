/*
 * Moon slots: the whole game as pure functions. No DOM, no timers, no Math.random.
 * `spin(state, rng)` takes the current state and a random source and returns the next state plus a
 * description of what happened, so the presentation only has to animate a result it is handed.
 *
 * RULES
 *  - Three reels of 16 stops each (REELS). A spin draws one stop per reel, uniformly and independently.
 *    The symbols that land in the window are the result; nothing is decided first and dressed up after.
 *  - The window shows three rows. The middle row is the payline.
 *  - A spin costs COST credits. The best single line below is paid:
 *
 *      three rockets anywhere in view (one per reel)   LAUNCH        75   the ship goes to the moon and back
 *      seven  seven  seven  on the payline             777
 *      full moon x3 / book x3                           75
 *      palm tree x3 / camera x3                         40
 *      wave x3                                          25
 *      crescent x3                                      15
 *      any two matching symbols on the payline           5   (the pull pays for itself)
 *
 *  - Moon meter: outside the free spins, a pair adds 1, three of a kind adds 2, and 777 or a launch
 *    fills it. At METER_MAX the moon is full: FREE_SPINS free pulls that pay double. When they are
 *    used up the meter goes back to zero.
 *  - Shooting star: catching one is worth STAR_BONUS credits and makes the next paid or free pull a
 *    guaranteed three of a kind (the reels are stopped on a matching line of an everyday symbol).
 *  - Perfect pull: the lever is a plunger. Letting go of it on its target (useLever judges that; the
 *    engine is only told) stops the first two reels on a matching pair, so the pull pays for itself
 *    and the third reel decides the rest. Dragging the lever and letting go off the target is a
 *    fumble: the pull costs FUMBLE_COST and the reels are stopped on a line that pays nothing. A
 *    tap never aims, so it is an ordinary pull. The opening pull and a caught star take precedence
 *    over both, and a fumbled free spin is still free.
 *  - Opening pull: a visitor's very first pull is free and always lands three full moons. It happens
 *    once: the saved game remembers it, so reloading the page cannot farm it.
 *  - Moon loan: if a pull is not free and there are fewer than COST credits, the moon lends LOAN
 *    credits first. Credits can therefore never go negative and the game can never get stuck.
 *  - Every outcome reconciles: credits after = credits before + loan - cost + payout.
 *
 * ODDS AND RETURN (exact, from the 16 x 16 x 16 = 4096 equally likely stop combinations)
 *      launch 54 (1.32%)   777 4 (0.10%)   three of a kind 93 (2.27%)   pair 1471 (35.91%)   miss 2474 (60.40%)
 *    The reels alone pay 16,758 credits per 4096 pulls of 5: a base return of 81.8%.
 *    The full moon round (one about every 17 paid pulls) adds roughly 29 points, so the long-run
 *    return is about 111%: 1.10 to 1.12 measured over a million pulls, 1.05 to 1.15 over a hundred
 *    thousand. It drifts gently upward and the loan covers the dry spells. Stars and the opening
 *    pull are gifts on top of that. engine.test.ts checks every number in this comment.
 *    A perfect pull draws the first and third stops as usual and matches the second to the first:
 *      launch 1/64 (1.56%)   777 1/64 (1.56%)   three of a kind 13/96 (13.54%)   pair 5/6   miss never
 *    That pays 21.1 credits per pull of 5 before the full moon round. Skill is meant to win, and
 *    aiming is a real risk: a fumble is 10 credits gone, every time.
 */

export type SymbolId = 'crescent' | 'moon' | 'wave' | 'palm' | 'camera' | 'book' | 'seven' | 'rocket';
export type Rng = () => number;
export type Stops = [number, number, number];
/** Whether the lever was aimed at its target: not at all (a tap), let go on it, or let go off it. */
export type Aim = 'none' | 'hit' | 'missed';
export type OutcomeKind = 'launch' | 'sevens' | 'triple' | 'pair' | 'miss';

export const COST = 5;
export const FUMBLE_COST = 10;
export const LOAN = 65;
export const START_CREDITS = 41;
export const STAR_BONUS = 7;
export const METER_MAX = 8;
export const FREE_SPINS = 3;
export const FREE_MULTIPLIER = 2;
export const REEL_LENGTH = 16;
const MAX_CREDITS = 9_999_999;

export const PAYTABLE = {
  launch: 75,
  pair: 5,
  triple: { seven: 777, moon: 75, book: 75, palm: 40, camera: 40, wave: 25, crescent: 15, rocket: 75 },
} as const satisfies { launch: number; pair: number; triple: Record<SymbolId, number> };

// Symbols a shooting star can line up: everything except the seven and the rocket.
const EVERYDAY: SymbolId[] = ['crescent', 'wave', 'palm', 'camera', 'book', 'moon'];

// prettier-ignore
export const REELS: readonly (readonly SymbolId[])[] = [
  ['crescent', 'wave', 'seven', 'palm', 'crescent', 'camera', 'wave', 'rocket', 'crescent', 'book', 'palm', 'seven', 'wave', 'crescent', 'camera', 'moon'],
  ['wave', 'crescent', 'rocket', 'camera', 'moon', 'palm', 'wave', 'crescent', 'book', 'seven', 'rocket', 'camera', 'wave', 'moon', 'palm', 'crescent'],
  ['palm', 'crescent', 'wave', 'camera', 'seven', 'crescent', 'moon', 'wave', 'palm', 'crescent', 'rocket', 'book', 'camera', 'crescent', 'seven', 'wave'],
];

export type Stats = {
  spins: number;
  jackpots: number;
  bestStreak: number;
  moonTrips: number;
  stars: number;
  loans: number;
};

export type GameState = {
  credits: number;
  /** 0..METER_MAX. It sits at METER_MAX exactly while free spins remain. */
  meter: number;
  freeSpins: number;
  /** A caught star is waiting: the next pull is a guaranteed three of a kind. */
  lucky: boolean;
  /** This visitor has not had their opening pull yet. */
  opening: boolean;
  streak: number;
  stats: Stats;
};

export type Outcome = {
  stops: Stops;
  /** The payline, left to right. */
  line: [SymbolId, SymbolId, SymbolId];
  kind: OutcomeKind;
  /** The matching symbol for a pair, three of a kind or 777; 'rocket' for a launch. */
  symbol: SymbolId | null;
  /** The winning cells as [reel, row], row -1 above the payline, 0 on it, 1 below. */
  cells: [number, number][];
  /** The first two reels set up a win, so the third is worth holding your breath for. */
  tease: boolean;
  /** No jackpot, but the symbol that would have made it stopped one row away. */
  nearMiss: boolean;
  cost: number;
  loan: number;
  multiplier: number;
  payout: number;
  free: boolean;
  opening: boolean;
  usedStar: boolean;
  /** The lever was let go on its target, and that is what paired the first two reels. */
  perfect: boolean;
  /** The lever was let go off its target, and that is what cost extra and stopped the reels on nothing. */
  fumbled: boolean;
  bonusStarted: boolean;
  bonusEnded: boolean;
};

/** A position on a reel strip, wrapped into 0..REEL_LENGTH-1. */
export const wrap = (n: number) => ((n % REEL_LENGTH) + REEL_LENGTH) % REEL_LENGTH;

/** The symbol on a reel at a stop, offset by rows (-1 is the row above the payline). */
export function symbolAt(reel: number, stop: number, row = 0): SymbolId {
  return REELS[reel][wrap(stop + row)];
}

export function initialState(): GameState {
  return {
    credits: START_CREDITS,
    meter: 0,
    freeSpins: 0,
    lucky: false,
    opening: true,
    streak: 0,
    stats: { spins: 0, jackpots: 0, bestStreak: 0, moonTrips: 0, stars: 0, loans: 0 },
  };
}

type Evaluation = Pick<Outcome, 'line' | 'kind' | 'symbol' | 'cells' | 'tease' | 'nearMiss'> & { base: number };

/** Reads the window at the given stops and returns the best line, before any multiplier. */
export function evaluate(stops: Stops): Evaluation {
  const line = [symbolAt(0, stops[0]), symbolAt(1, stops[1]), symbolAt(2, stops[2])] as Outcome['line'];
  const rows = [-1, 0, 1];
  const rocketRow = stops.map((stop, reel) => rows.find((row) => symbolAt(reel, stop, row) === 'rocket'));
  const [a, b, c] = line;
  const rocketsLeading = rocketRow[0] !== undefined && rocketRow[1] !== undefined;
  const tease = a === b || rocketsLeading;

  if (rocketRow.every((row) => row !== undefined)) {
    const cells = rocketRow.map((row, reel) => [reel, row as number] as [number, number]);
    return { line, kind: 'launch', symbol: 'rocket', cells, tease, nearMiss: false, base: PAYTABLE.launch };
  }
  if (a === b && b === c) {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ];
    const kind = a === 'seven' ? 'sevens' : 'triple';
    return { line, kind, symbol: a, cells, tease, nearMiss: false, base: PAYTABLE.triple[a] };
  }

  const justOffLine = a === b && (symbolAt(2, stops[2], -1) === a || symbolAt(2, stops[2], 1) === a);
  const rocketJustOutOfView =
    rocketsLeading && (symbolAt(2, stops[2], -2) === 'rocket' || symbolAt(2, stops[2], 2) === 'rocket');
  const nearMiss = justOffLine || rocketJustOutOfView;

  const symbol = a === b || a === c ? a : b === c ? b : null;
  if (symbol) {
    const cells = line.flatMap((s, reel) => (s === symbol ? [[reel, 0] as [number, number]] : []));
    return { line, kind: 'pair', symbol, cells, tease, nearMiss, base: PAYTABLE.pair };
  }
  return { line, kind: 'miss', symbol: null, cells: [], tease, nearMiss, base: 0 };
}

const draw = (rng: Rng, n: number) => Math.min(n - 1, Math.max(0, Math.floor(rng() * n)));

function randomStops(rng: Rng): Stops {
  return [draw(rng, REEL_LENGTH), draw(rng, REEL_LENGTH), draw(rng, REEL_LENGTH)];
}

// A perfect pull: the first reel lands where it lands, the second is stopped on the same symbol,
// and the third is left to chance.
function pairedStops(rng: Rng): Stops {
  const first = draw(rng, REEL_LENGTH);
  const symbol = REELS[0][first];
  const positions = REELS[1].flatMap((s, i) => (s === symbol ? [i] : []));
  return [first, positions[draw(rng, positions.length)], draw(rng, REEL_LENGTH)];
}

// A fumble: stops that pay nothing. Six draws in ten are a miss already; the rest are drawn again.
function losingStops(rng: Rng): Stops {
  for (let tries = 0; tries < 40; tries++) {
    const stops = randomStops(rng);
    if (evaluate(stops).kind === 'miss') return stops;
  }
  return [1, 3, 0]; // wave, camera, palm
}

// Stops every reel on the same symbol, choosing among that symbol's positions on each reel.
function matchingStops(symbol: SymbolId, rng: Rng): Stops {
  return REELS.map((strip) => {
    const positions = strip.flatMap((s, i) => (s === symbol ? [i] : []));
    return positions[draw(rng, positions.length)];
  }) as Stops;
}

/** One pull of the lever. Pure: the same state and the same random numbers give the same result. */
export function spin(
  state: GameState,
  rng: Rng,
  aim: Aim = 'none',
): { state: GameState; outcome: Outcome } {
  const opening = state.opening;
  const free = !opening && state.freeSpins > 0;
  const usedStar = !opening && state.lucky;
  const perfect = aim === 'hit' && !opening && !usedStar;
  const fumbled = aim === 'missed' && !opening && !usedStar;
  const cost = opening || free ? 0 : fumbled ? FUMBLE_COST : COST;
  const loan = state.credits < cost ? LOAN : 0;

  const stops = opening
    ? matchingStops('moon', rng)
    : usedStar
      ? matchingStops(EVERYDAY[draw(rng, EVERYDAY.length)], rng)
      : perfect
        ? pairedStops(rng)
        : fumbled
          ? losingStops(rng)
          : randomStops(rng);
  const { base, ...result } = evaluate(stops);
  const multiplier = free ? FREE_MULTIPLIER : 1;
  const payout = base * multiplier;
  const won = result.kind !== 'miss';
  const jackpot = won && result.kind !== 'pair';
  const streak = won ? state.streak + 1 : 0;

  let meter = state.meter;
  let freeSpins = free ? state.freeSpins - 1 : state.freeSpins;
  let bonusStarted = false;
  let bonusEnded = false;
  if (free) {
    if (freeSpins === 0) {
      meter = 0;
      bonusEnded = true;
    }
  } else if (state.freeSpins === 0) {
    const feed = result.kind === 'pair' ? 1 : result.kind === 'triple' ? 2 : jackpot ? METER_MAX : 0;
    meter = Math.min(METER_MAX, meter + feed);
    if (meter === METER_MAX) {
      freeSpins = FREE_SPINS;
      bonusStarted = true;
    }
  }

  const next: GameState = {
    credits: Math.min(MAX_CREDITS, state.credits + loan - cost + payout),
    meter,
    freeSpins,
    lucky: usedStar ? false : state.lucky,
    opening: false,
    streak,
    stats: {
      spins: state.stats.spins + 1,
      jackpots: state.stats.jackpots + (jackpot ? 1 : 0),
      bestStreak: Math.max(state.stats.bestStreak, streak),
      moonTrips: state.stats.moonTrips + (result.kind === 'launch' ? 1 : 0),
      stars: state.stats.stars,
      loans: state.stats.loans + (loan ? 1 : 0),
    },
  };
  return {
    state: next,
    outcome: { stops, ...result, cost, loan, multiplier, payout, free, opening, usedStar, perfect, fumbled, bonusStarted, bonusEnded },
  };
}

/** A caught shooting star: a few credits now and a guaranteed three of a kind on the next pull. */
export function catchStar(state: GameState): GameState {
  return {
    ...state,
    credits: Math.min(MAX_CREDITS, state.credits + STAR_BONUS),
    lucky: true,
    stats: { ...state.stats, stars: state.stats.stars + 1 },
  };
}

const count = (value: unknown, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : fallback;

/**
 * Rebuilds a playable state from whatever was stored, however old or mangled it is. A save that
 * does not say the opening pull is still owed (every save from before that was recorded) counts
 * as having had it.
 */
export function fromSaved(saved: unknown): GameState {
  const fresh = initialState();
  if (!saved || typeof saved !== 'object') return fresh;
  const s = saved as Record<string, unknown>;
  const stats = (s.stats && typeof s.stats === 'object' ? s.stats : {}) as Record<string, unknown>;
  const freeSpins = count(s.freeSpins, FREE_SPINS, 0);
  return {
    ...fresh,
    credits: count(s.credits, MAX_CREDITS, fresh.credits),
    // The meter is full exactly while free spins remain.
    meter: freeSpins > 0 ? METER_MAX : count(s.meter, METER_MAX - 1, 0),
    freeSpins,
    lucky: s.lucky === true,
    opening: s.opening === true,
    streak: count(s.streak, MAX_CREDITS, 0),
    stats: {
      spins: count(stats.spins, MAX_CREDITS, 0),
      jackpots: count(stats.jackpots, MAX_CREDITS, 0),
      bestStreak: count(stats.bestStreak, MAX_CREDITS, 0),
      moonTrips: count(stats.moonTrips, MAX_CREDITS, 0),
      stars: count(stats.stars, MAX_CREDITS, 0),
      loans: count(stats.loans, MAX_CREDITS, 0),
    },
  };
}
