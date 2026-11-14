/*
 * How a pull is revealed once the engine has decided it: what the sign says, when the counters
 * move, what shakes and what rains. Plain async functions over a `Stage`, so each beat reads top
 * to bottom; useShow builds the stage and runs them.
 */
import { beats, type Round } from './beats';
import { FREE_MULTIPLIER, FREE_SPINS, type GameState, type Outcome, type OutcomeKind } from './engine';
import { isCalm, pick } from './motion';
import type { Particles } from './useParticles';
import { cellIndex, cellKey, type Reels } from './useReels';
import type { Ship } from './useShip';
import type { Sound } from './useSound';
import type { Timers } from './useTimers';
import { WORDS } from './words';

type SignTone = 'dim' | 'blue' | 'plum' | 'jack' | 'hot';
type BulbMode = 'idle' | 'spin' | 'tease' | 'pair' | 'win';
type HitKind = 'pair' | 'win' | 'launch';
/** One-shot effects. Each is a counter; the component that owns the element replays it on change. */
export type Pulse = 'shake' | 'bigShake' | 'flash' | 'pop' | 'jig' | 'bump' | 'nudge';

/** Everything on screen that is not derived from the game state. */
export type Show = {
  sign: { text: string; tone: SignTone; beat: number };
  hits: { cells: string[]; kind: HitKind } | null;
  floats: { id: number; text: string; big: boolean }[];
  bulbs: BulbMode;
  rumbling: boolean;
  leverDown: boolean;
  pulses: Record<Pulse, number>;
  busy: boolean;
  last: Outcome | null;
  announce: string;
};

export const OPENING_SHOW: Show = {
  sign: { text: WORDS.waiting, tone: 'dim', beat: 0 },
  hits: null,
  floats: [],
  bulbs: 'idle',
  rumbling: false,
  leverDown: false,
  pulses: { shake: 0, bigShake: 0, flash: 0, pop: 0, jig: 0, bump: 0, nudge: 0 },
  busy: false,
  last: null,
  announce: '',
};

/** What a script can do to the machine. */
export type Stage = Timers & {
  say: (text: string, tone: SignTone) => void;
  set: (change: Partial<Show>) => void;
  pulse: (name: Pulse) => void;
  /** A payout tag that floats up off the reels. */
  float: (text: string, big: boolean) => void;
  /** Lets the counters catch up to this state. */
  reveal: (state: GameState) => void;
  reels: Reels;
  particles: Particles;
  sound: Sound;
  fly: Ship['fly'];
  /** Elements that coins and the ship fly between. */
  spots: Record<'reels' | 'moon' | 'purse', () => Element | null>;
};

type Script = {
  bulbs: BulbMode;
  hit: HitKind;
  /** Runs before the payout lands on the counter. */
  prelude?: (stage: Stage, round: Round) => Promise<void>;
  celebrate: (stage: Stage, round: Round) => Promise<void>;
};

const credits = (n: number) => `${n} ${WORDS.labels.credits}.`;

/** The line read to screen readers once the reels stop. Ends with the balance so repeats still differ. */
function describe({ after, outcome }: Round): string {
  const symbol = outcome.symbol ? WORDS.symbols[outcome.symbol] : '';
  const won = `${outcome.payout} ${WORDS.announce.won}`;
  const result = {
    launch: `${WORDS.announce.launch} ${won}`,
    sevens: `${WORDS.announce.jackpot} ${symbol}. ${won}`,
    triple: `${WORDS.announce.jackpot} ${symbol}. ${won}`,
    pair: `${WORDS.announce.pair} ${symbol}. ${won}`,
    miss: WORDS.announce.miss,
  }[outcome.kind];
  return `${result} ${credits(after.credits)}`;
}

function payOut(stage: Stage, { payout }: Outcome, coins: number, power: number) {
  const reels = stage.spots.reels();
  stage.float(`+${payout}`, coins > 20);
  if (reels) stage.particles.burst(coins, stage.particles.spot(reels), power);
}

async function countDownAndFly(stage: Stage, { outcome }: Round) {
  const { sound } = stage;
  stage.set({ rumbling: true });
  for (let n = 3; n >= 1; n--) {
    stage.say(`${WORDS.countdown}${n}`, 'hot');
    sound.blip(440, 0.12, 'square', 0.06);
    await stage.wait(430);
  }
  stage.set({ rumbling: false });
  stage.say(WORDS.liftoff, 'jack');
  sound.blip(90, 1.6, 'sawtooth', 0.07, 0, 900);

  // The ship leaves from the middle reel's rocket, whichever row it stopped in.
  const [, row] = outcome.cells[1];
  const pad = stage.reels.cell(1, outcome.stops[1], row);
  const moon = stage.spots.moon();
  if (isCalm() || !pad || !moon) {
    await stage.wait(500);
    stage.say(WORDS.roundTripCalm, 'plum');
    return;
  }
  stage.pulse('bigShake');
  await stage.fly({
    pad,
    moon,
    onMoon: () => {
      stage.say(WORDS.toTheMoon, 'plum');
      stage.pulse('jig');
      sound.tune([523, 659, 784, 1047], 0.07);
    },
    onReturn: () => {
      stage.say(WORDS.andBack, 'plum');
      sound.blip(700, 0.9, 'sawtooth', 0.05, 0, 110);
    },
  });
  stage.pulse('shake');
}

async function roundTrip(stage: Stage, { outcome }: Round) {
  payOut(stage, outcome, 180, 1.25);
  stage.particles.rain(2600);
  stage.pulse('flash');
  navigator.vibrate?.([60, 40, 60, 40, 140]);
  stage.sound.tune([523, 659, 784, 1047, 1319, 1568], 0.09);
  await stage.wait(1500);
  stage.say(`${WORDS.roundTrip} +${outcome.payout}`, 'jack');
}

async function jackpot(stage: Stage, { outcome }: Round) {
  const sevens = outcome.kind === 'sevens';
  stage.say(sevens ? WORDS.sevens : WORDS.jackpot, 'jack');
  stage.pulse(sevens ? 'bigShake' : 'shake');
  payOut(stage, outcome, sevens ? 200 : 130, sevens ? 1.3 : 1);
  navigator.vibrate?.([40, 40, 80]);
  if (sevens) {
    stage.pulse('flash');
    stage.particles.rain(2400);
    stage.sound.tune([659, 784, 988, 1319, 988, 1319, 1568], 0.085);
  } else {
    stage.sound.tune([523, 659, 784, 1047], 0.09);
  }
  await stage.wait(1500);
  const name = outcome.symbol ? WORDS.triple[outcome.symbol] : WORDS.jackpot;
  stage.say(outcome.multiplier > 1 ? `${name} x${outcome.multiplier}` : name, 'plum');
}

async function pair(stage: Stage, { outcome }: Round) {
  stage.say(`${outcome.nearMiss ? WORDS.nearMiss : WORDS.pair} +${outcome.payout}`, 'blue');
  payOut(stage, outcome, 14, 0.7);
  stage.sound.tune([523, 784], 0.08);
  await stage.wait(650);
}

async function miss(stage: Stage, { outcome }: Round) {
  stage.sound.blip(160, 0.18, 'square', 0.04, 0, 90);
  // A near miss with nothing on the payline can only be two rockets and a third just out of view.
  const rocketsScrubbed = outcome.nearMiss && outcome.line[0] !== outcome.line[1];
  const themed = outcome.line.flatMap((symbol) => WORDS.missBySymbol[symbol] ?? []);
  // Lines about what is on the payline are twice as likely as the generic ones.
  stage.say(rocketsScrubbed ? WORDS.rocketMiss : pick([...WORDS.miss, ...themed, ...themed]), 'dim');
  await stage.wait(250);
}

const SCRIPTS: Record<OutcomeKind, Script> = {
  launch: { bulbs: 'win', hit: 'launch', prelude: countDownAndFly, celebrate: roundTrip },
  sevens: { bulbs: 'win', hit: 'win', celebrate: jackpot },
  triple: { bulbs: 'win', hit: 'win', celebrate: jackpot },
  pair: { bulbs: 'pair', hit: 'pair', celebrate: pair },
  miss: { bulbs: 'idle', hit: 'win', celebrate: miss },
};

// The moon turning full (free spins begin) or setting (they are spent).
async function turnTheMoon(stage: Stage, { after, outcome }: Round) {
  if (outcome.bonusStarted) {
    await stage.wait(outcome.kind === 'pair' ? 700 : 900);
    stage.reveal(after);
    stage.set({ bulbs: 'win', announce: `${WORDS.announce.fullMoon} ${credits(after.credits)}` });
    stage.pulse('pop');
    stage.say(WORDS.fullMoon, 'jack');
    const moon = stage.spots.moon();
    if (moon) stage.particles.burst(60, stage.particles.spot(moon), 0.8);
    stage.sound.tune([392, 523, 659, 784, 1047], 0.1, 'triangle', 0.08);
    await stage.wait(1300);
    stage.say(`${FREE_SPINS} ${WORDS.freeSpins} x${FREE_MULTIPLIER}`, 'plum');
    await stage.wait(500);
  } else if (outcome.bonusEnded) {
    await stage.wait(900);
    stage.reveal(after);
    stage.say(WORDS.moonset, 'dim');
    stage.set({ bulbs: 'idle' });
  }
}

/** The moon lends credits before a pull that could not otherwise be paid for. */
export async function lendCredits(stage: Stage, round: Round) {
  const { particles, sound } = stage;
  stage.say(WORDS.broke, 'dim');
  sound.blip(200, 0.3, 'square', 0.05, 0, 90);
  await stage.wait(800);
  stage.say(`${WORDS.loan} ${round.outcome.loan}`, 'jack');
  stage.pulse('jig');
  stage.set({ announce: `${WORDS.announce.loan} ${round.outcome.loan}.` });
  const moon = stage.spots.moon();
  const purse = stage.spots.purse();
  if (moon && purse) {
    // Coins tip out of the moon toward the credit counter.
    const from = particles.spot(moon, 0.5, 0.8);
    const drift = (particles.spot(purse).x - from.x) / 46;
    for (let i = 0; i < 34; i++) stage.later(() => particles.coin(from, drift, -3, 7), i * 22);
  }
  stage.reveal(beats.lent(round));
  stage.pulse('bump');
  sound.tune([392, 523, 659], 0.08);
  await stage.wait(1300);
}

/** Everything that happens once the reels have stopped. */
export async function revealRound(stage: Stage, round: Round) {
  const { before, outcome } = round;
  const script = SCRIPTS[outcome.kind];
  const cells = outcome.cells.map(([reel, row]) => cellKey(reel, cellIndex(outcome.stops[reel], row)));
  stage.set({
    last: outcome,
    bulbs: script.bulbs,
    hits: cells.length ? { cells, kind: script.hit } : null,
    announce: describe(round),
  });

  await script.prelude?.(stage, round);

  // The payout lands: credits, stats and streak catch up, and the moon grows if it was fed.
  const landed = beats.landed(round);
  stage.reveal(landed);
  if (landed.meter > before.meter) stage.pulse('pop');
  if (outcome.payout) stage.pulse('bump');

  await script.celebrate(stage, round);
  await turnTheMoon(stage, round);
}
