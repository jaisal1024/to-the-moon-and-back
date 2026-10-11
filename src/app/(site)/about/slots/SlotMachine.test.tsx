import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  COST,
  FREE_MULTIPLIER,
  FREE_SPINS,
  FUMBLE_COST,
  type GameState,
  initialState,
  LOAN,
  PAYTABLE,
  REEL_LENGTH,
  type Rng,
  STAR_BONUS,
  START_CREDITS,
  type Stops,
} from './engine';
import { canWrite } from './pixels';
import SlotMachine from './SlotMachine';
import { STORAGE_KEY } from './storage';
import { isOnTarget, powerAt, TARGET, targetPath } from './useLever';
import { WORDS } from './words';

// A random source that lands the reels on the queued stops, one pull after another.
function landing(...pulls: number[][]): Rng {
  const queue = pulls.flat().map((stop) => (stop + 0.5) / REEL_LENGTH);
  return () => queue.shift() ?? 0;
}
// The opening pull reads three numbers to choose among the full moons; any will do.
const OPENING: Stops = [0, 0, 0];
const MISS: Stops = [1, 3, 0]; // wave, camera, palm
const PAIR: Stops = [1, 0, 3]; // wave, wave, camera
const NEAR_MISS: Stops = [1, 0, 1]; // wave, wave, crescent with a wave one row below
const LAUNCH: Stops = [7, 2, 10];
// How long a held key takes to pump the lever down to the middle of its resting target.
const HOLD_TO_TARGET_MS = 392;
const OPENED = START_CREDITS + PAYTABLE.triple.moon;

// A returning visitor: the opening pull is behind them.
const returning = (over: Partial<GameState> = {}): GameState => ({ ...initialState(), opening: false, ...over });
const seed = (state: unknown, key = STORAGE_KEY) => window.localStorage.setItem(key, JSON.stringify(state));
const saved = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');

const machine = () => screen.getByTestId('slot-machine');
const lever = () => screen.getByRole('button', { name: WORDS.labels.lever });
const credits = () => Number(machine().getAttribute('data-credits'));
const sign = () => document.querySelector('[data-tone]')?.getAttribute('data-text');
const stats = () => screen.getByTestId('slot-stats');
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const settle = () => tick(8000);
// Pulls and waits for the pull to finish. The default wait runs on into the idle hints;
// pass a shorter one to read what the sign says about the result.
async function pull(ms = 8000) {
  fireEvent.click(lever());
  await tick(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('first render', () => {
  test('is a deterministic new game', () => {
    render(<SlotMachine />);
    expect(lever()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: WORDS.labels.reels })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: WORDS.labels.soundOff })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: `${START_CREDITS} credits` })).toBeInTheDocument();
    expect(machine()).toHaveAttribute('data-busy', 'false');
    expect(stats()).toHaveTextContent('spins0');
    expect(sign()).toBe(WORDS.waiting);
    expect(screen.getByLabelText(WORDS.labels.star)).not.toBeVisible();
  });
});

describe('pulling', () => {
  test("a new visitor's first pull is free, pays three full moons and is saved", async () => {
    render(<SlotMachine rng={landing(OPENING)} />);
    await pull();

    expect(machine()).toHaveAttribute('data-kind', 'triple');
    expect(machine()).toHaveAttribute('data-line', 'moon moon moon');
    expect(machine()).toHaveAttribute('data-cost', '0');
    expect(credits()).toBe(OPENED);
    expect(screen.getByRole('img', { name: `${OPENED} credits` })).toBeInTheDocument();
    expect(stats()).toHaveTextContent('spins1');
    expect(stats()).toHaveTextContent('jackpots1');
    expect(document.querySelectorAll('[data-hit="win"]')).toHaveLength(3);
    expect(saved()).toMatchObject({ credits: OPENED, opening: false, meter: 2, stats: { spins: 1, jackpots: 1 } });
  });

  test('the opening jackpot happens once per visitor: the next visit opens with an ordinary pull', async () => {
    const first = render(<SlotMachine rng={landing(OPENING)} />);
    await pull();
    first.unmount();

    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    expect(credits()).toBe(OPENED);
    await pull();
    expect(machine()).toHaveAttribute('data-kind', 'miss');
    expect(machine()).toHaveAttribute('data-cost', String(COST));
    expect(credits()).toBe(OPENED - COST);
    expect(stats()).toHaveTextContent('jackpots1');
    expect(saved()).toMatchObject({ meter: 2, stats: { spins: 2, jackpots: 1 } });
  });

  test('a save from the previous storage version is carried over and has had its opening pull', async () => {
    seed({ credits: 300, meter: 1, freeSpins: 0, lucky: false, stats: { spins: 9, jackpots: 2 } }, 'moon-slots:v1');
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    expect(credits()).toBe(300);
    await pull();
    expect(machine()).toHaveAttribute('data-cost', String(COST));
    expect(credits()).toBe(300 - COST);
    expect(saved()).toMatchObject({ credits: 300 - COST, opening: false });
  });

  test('later pulls cost credits, pay by the paytable and mark the winning cells', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS, PAIR)} />);
    await pull();

    await pull();
    expect(machine()).toHaveAttribute('data-kind', 'miss');
    expect(credits()).toBe(OPENED - COST);
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(0);

    await pull();
    expect(machine()).toHaveAttribute('data-kind', 'pair');
    expect(machine()).toHaveAttribute('data-line', 'wave wave camera');
    expect(credits()).toBe(OPENED - COST - COST + PAYTABLE.pair);
    expect(document.querySelectorAll('[data-hit="pair"]')).toHaveLength(2);
    expect(stats()).toHaveTextContent('spins3');
  });

  test('a pair that just missed three of a kind says so', async () => {
    seed(returning());
    render(<SlotMachine rng={landing(NEAR_MISS)} />);
    await pull(1000);
    expect(machine()).toHaveAttribute('data-line', 'wave wave crescent');
    expect(sign()).toBe(`${WORDS.nearMiss} +${PAYTABLE.pair}`);
  });

  test('pulls while the reels are turning are ignored', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS, MISS)} />);
    fireEvent.click(lever());
    fireEvent.click(lever());
    fireEvent.click(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins1');
  });

  test('a new rng prop does not restart the game', async () => {
    const { rerender } = render(<SlotMachine rng={landing(OPENING)} />);
    await pull();
    rerender(<SlotMachine rng={landing(PAIR)} />);
    await tick(0);
    expect(credits()).toBe(OPENED);
    expect(machine()).toHaveAttribute('data-kind', 'triple');
    await pull();
    // An ordinary pull from the new source: the opening pull did not come back.
    expect(machine()).toHaveAttribute('data-kind', 'pair');
    expect(stats()).toHaveTextContent('spins2');
  });
});

describe('launch and free spins', () => {
  test('three rockets pay the launch, count a moon trip and fill the moon', async () => {
    seed(returning({ credits: 50 }));
    render(<SlotMachine rng={landing(LAUNCH)} />);
    await pull(4000);
    expect(machine()).toHaveAttribute('data-busy', 'false');
    expect(machine()).toHaveAttribute('data-kind', 'launch');
    expect(credits()).toBe(50 - COST + PAYTABLE.launch);
    expect(stats()).toHaveTextContent('moon trips1');
    expect(machine()).toHaveAttribute('data-moonlit', 'true');
    expect(sign()).toBe(`${FREE_SPINS} ${WORDS.freeSpins} x${FREE_MULTIPLIER}`);
  });

  test('the free spins cost nothing, pay double, and end with the moon setting', async () => {
    seed(returning({ credits: 50 }));
    render(<SlotMachine rng={landing(LAUNCH, MISS, PAIR, MISS, MISS)} />);
    await pull();
    let balance = credits();

    await pull();
    expect(machine()).toHaveAttribute('data-cost', '0');
    expect(credits()).toBe(balance);
    expect(machine()).toHaveAttribute('data-moonlit', 'true');

    await pull();
    expect(machine()).toHaveAttribute('data-payout', String(PAYTABLE.pair * FREE_MULTIPLIER));
    balance += PAYTABLE.pair * FREE_MULTIPLIER;
    expect(credits()).toBe(balance);

    await pull(2000);
    expect(machine()).toHaveAttribute('data-busy', 'false');
    expect(machine()).toHaveAttribute('data-cost', '0');
    expect(machine()).not.toHaveAttribute('data-moonlit');
    expect(sign()).toBe(WORDS.moonset);
    expect(saved()).toMatchObject({ meter: 0, freeSpins: 0 });

    await pull();
    expect(machine()).toHaveAttribute('data-cost', String(COST));
    expect(credits()).toBe(balance - COST);
  });
});

describe('the lever as a plunger', () => {
  // A repeatable stream of random numbers, one stream per seed.
  const stream = (seed: number) => {
    let state = (seed * 2654435761) % 2147483647;
    return () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
  };

  test('the target sets off from its rest and never leaves its run or jumps', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const at = targetPath(stream(seed));
      expect(at(0)).toBeCloseTo(TARGET.rest);
      for (let ms = 0; ms < 6000; ms += 16) {
        expect(at(ms)).toBeGreaterThanOrEqual(TARGET.low - 1e-9);
        expect(at(ms)).toBeLessThanOrEqual(TARGET.high + 1e-9);
        expect(Math.abs(at(ms + 16) - at(ms))).toBeLessThan(0.03);
      }
    }
  });

  test('no two wanders are alike: it may set off either way, and at different speeds', () => {
    const firstMoves = Array.from({ length: 40 }, (_, i) => targetPath(stream(i + 1))(60) - TARGET.rest);
    expect(firstMoves.some((move) => move > 0)).toBe(true);
    expect(firstMoves.some((move) => move < 0)).toBe(true);
    expect(new Set(firstMoves.map((move) => Math.abs(move).toFixed(3))).size).toBeGreaterThan(20);
  });

  test('it doubles back at unpredictable moments', () => {
    const turnsIn = (seed: number) => {
      const at = targetPath(stream(seed));
      const turns: number[] = [];
      for (let ms = 16; ms < 3000; ms += 16)
        if (Math.sign(at(ms + 16) - at(ms)) === -Math.sign(at(ms) - at(ms - 16))) turns.push(ms);
      return turns;
    };
    expect(turnsIn(1).length).toBeGreaterThan(2);
    expect(turnsIn(1)).not.toEqual(turnsIn(2));
  });

  test('the same random numbers give the same wander', () => {
    const [a, b] = [targetPath(stream(7)), targetPath(stream(7))];
    for (let ms = 0; ms < 3000; ms += 50) expect(a(ms)).toBe(b(ms));
  });

  test('a knob within reach of the target is on it; a lever at rest never is', () => {
    expect(isOnTarget(TARGET.rest)).toBe(true);
    expect(isOnTarget(0.45, 0.5)).toBe(true);
    expect(isOnTarget(0.35, 0.5)).toBe(false);
    const at = targetPath(stream(3));
    for (let ms = 0; ms < 4000; ms += 37) expect(isOnTarget(0, at(ms))).toBe(false);
  });

  test('a held key pumps the lever down and back up, through the resting target', () => {
    expect(powerAt(0)).toBe(0);
    expect(powerAt(HOLD_TO_TARGET_MS)).toBeCloseTo(TARGET.rest, 2);
    expect(powerAt(560)).toBeCloseTo(1);
    expect(powerAt(1120)).toBeCloseTo(0);
  });

  test('everything gets quicker with every perfect pull in a row, up to a limit', () => {
    const moved = (perfects: number) => Math.abs(targetPath(() => 0.9, perfects)(50) - TARGET.rest);
    expect(moved(1)).toBeGreaterThan(moved(0));
    expect(moved(2)).toBeGreaterThan(moved(1));
    expect(moved(60)).toBeCloseTo(moved(50));
    expect(powerAt(200, 1)).toBeGreaterThan(powerAt(200, 0));
    expect(powerAt(140, 50)).toBeCloseTo(0.5);
  });
});

describe('controls', () => {
  // Pressing a key winds the lever up; letting it go pulls.
  const press = (element: Element, key: string) => {
    const handled = !fireEvent.keyDown(element, { key });
    fireEvent.keyUp(element, { key });
    return handled;
  };

  test('space and enter pull only from the reels, and the page keeps its own keys', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS, MISS)} />);
    const reels = screen.getByRole('button', { name: WORDS.labels.reels });

    expect(press(document.body, ' ')).toBe(false);
    await settle();
    expect(stats()).toHaveTextContent('spins0');

    expect(press(reels, ' ')).toBe(true); // handled, so the page does not scroll
    await settle();
    press(reels, 'Enter');
    await settle();
    expect(stats()).toHaveTextContent('spins2');
    expect(press(reels, 'ArrowDown')).toBe(false);
  });

  test('holding a key down is one pull, not a stream of them', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS, MISS)} />);
    const reels = screen.getByRole('button', { name: WORDS.labels.reels });
    fireEvent.keyDown(reels, { key: ' ' });
    fireEvent.keyDown(reels, { key: ' ', repeat: true });
    fireEvent.keyDown(reels, { key: ' ', repeat: true });
    expect(stats()).toHaveTextContent('spins0');
    fireEvent.keyUp(reels, { key: ' ' });
    await settle();
    expect(stats()).toHaveTextContent('spins1');
    // The lever handles its own keys too, so a held Enter cannot repeat the button's click.
    expect(fireEvent.keyDown(lever(), { key: 'Enter', repeat: true })).toBe(false);
  });

  // jsdom has no layout: give the lever a height so a drag can be measured. The knob travels 60% of it.
  const LEVER_HEIGHT = 200;
  const KNOB_TRAVEL = LEVER_HEIGHT * 0.6;
  const sized = () => {
    Object.defineProperty(lever(), 'offsetHeight', { value: LEVER_HEIGHT, configurable: true });
    return lever();
  };
  const target = () => Number(lever().style.getPropertyValue('--target'));
  /** Drags the knob for `ms`, ending `pull` of the way down (by default, on the target), without letting go. */
  async function dragFor(ms: number, pull: (target: number) => number = (on) => on) {
    const element = sized();
    fireEvent.pointerDown(element, { clientY: 0 });
    await tick(ms);
    fireEvent.pointerMove(element, { clientY: pull(target()) * KNOB_TRAVEL });
  }

  test('a quick press and release of the lever is one ordinary pull', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS)} />);
    fireEvent.pointerDown(lever());
    expect(lever()).toHaveAttribute('data-held');
    fireEvent.pointerUp(lever());
    expect(lever()).not.toHaveAttribute('data-held');
    fireEvent.click(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins1');
    expect(machine()).not.toHaveAttribute('data-perfect');
  });

  test('dragging the knob onto the wandering target and letting go is a perfect pull', async () => {
    seed(returning({ credits: 50 }));
    // A perfect pull stops the second reel on the first reel's symbol, whatever was drawn for it.
    render(<SlotMachine rng={landing([1, 0, 3])} />);
    await tick(0);
    await dragFor(500);
    expect(lever()).toHaveAttribute('data-on-target');
    expect(target()).not.toBe(TARGET.rest);
    fireEvent.pointerUp(lever());
    fireEvent.click(lever()); // the browser's click after a drag is not a second pull
    await settle();
    expect(machine()).toHaveAttribute('data-perfect');
    expect(machine()).toHaveAttribute('data-kind', 'pair');
    expect(machine()).toHaveAttribute('data-line', 'wave wave camera');
    expect(credits()).toBe(50 - COST + PAYTABLE.pair);
    expect(stats()).toHaveTextContent('spins1');
  });

  test('letting go off the target is a fumble: it costs double and pays nothing', async () => {
    seed(returning({ credits: 50 }));
    // The reels would have shown a pair; a fumble draws again until they show nothing.
    render(<SlotMachine rng={landing(PAIR, MISS)} />);
    await tick(0);
    await dragFor(500, (on) => (on > 0.6 ? on - 0.3 : on + 0.3));
    expect(lever()).not.toHaveAttribute('data-on-target');
    fireEvent.pointerUp(lever());
    await tick(100);
    await settle();
    expect(machine()).toHaveAttribute('data-fumbled');
    expect(machine()).not.toHaveAttribute('data-perfect');
    expect(machine()).toHaveAttribute('data-kind', 'miss');
    expect(machine()).toHaveAttribute('data-cost', String(FUMBLE_COST));
    expect(credits()).toBe(50 - FUMBLE_COST);
  });

  test('a tap never aims, so it is never a fumble', async () => {
    seed(returning({ credits: 50 }));
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    await pull();
    expect(machine()).not.toHaveAttribute('data-fumbled');
    expect(credits()).toBe(50 - COST);
  });

  test('a drag let go near the top is a change of mind, not a pull', async () => {
    seed(returning({ credits: 50 }));
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    await dragFor(200, () => 0.1);
    fireEvent.pointerUp(lever());
    fireEvent.click(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins0');
    expect(lever().style.getPropertyValue('--pull')).toBe('0');
  });

  test('holding Space pumps the lever, and letting go on the target is a perfect pull', async () => {
    seed(returning({ credits: 50 }));
    render(<SlotMachine rng={landing([1, 0, 3], [1, 0, 3])} />);
    await tick(0);
    fireEvent.keyDown(lever(), { key: ' ' });
    await tick(HOLD_TO_TARGET_MS);
    expect(lever()).toHaveAttribute('data-on-target');
    fireEvent.keyUp(lever(), { key: ' ' });
    await settle();
    expect(machine()).toHaveAttribute('data-perfect');
    // Each perfect pull in a row makes the lever quicker, so the target comes round sooner.
    const reels = screen.getByRole('button', { name: WORDS.labels.reels });
    fireEvent.keyDown(reels, { key: ' ' });
    await tick(HOLD_TO_TARGET_MS * 0.88);
    fireEvent.keyUp(reels, { key: ' ' });
    await settle();
    expect(machine()).toHaveAttribute('data-perfect');
    expect(stats()).toHaveTextContent('spins2');
  });

  test('from the keyboard, letting go off the target is only an ordinary pull', async () => {
    seed(returning({ credits: 50 }));
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    fireEvent.keyDown(lever(), { key: ' ' });
    await tick(HOLD_TO_TARGET_MS / 3);
    fireEvent.keyUp(lever(), { key: ' ' });
    await settle();
    expect(machine()).not.toHaveAttribute('data-fumbled');
    expect(credits()).toBe(50 - COST);
  });

  test('a drag the browser takes over puts the lever back without pulling', async () => {
    render(<SlotMachine rng={landing(OPENING)} />);
    await dragFor(300, () => 0.7);
    fireEvent.pointerCancel(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins0');
    expect(lever()).not.toHaveAttribute('data-held');
    expect(lever().style.getPropertyValue('--pull')).toBe('0');
    expect(target()).toBe(TARGET.rest);
  });

  test('the lever cannot be taken hold of while a pull is playing', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS)} />);
    fireEvent.click(lever());
    await tick(100);
    fireEvent.pointerDown(lever());
    expect(lever()).not.toHaveAttribute('data-held');
    fireEvent.pointerUp(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins1');
  });

  test('the sound toggle is off by default and stays quiet where audio is missing', () => {
    render(<SlotMachine />);
    fireEvent.click(screen.getByRole('button', { name: WORDS.labels.soundOff }));
    expect(screen.getByRole('button', { name: WORDS.labels.soundOff })).toBeInTheDocument();
  });

  test('a refused audio start is swallowed', async () => {
    const resume = vi.fn(() => Promise.reject(new Error('not allowed')));
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 0;
        resume = resume;
        close = () => Promise.resolve();
        createOscillator() {
          throw new Error('no audio');
        }
      },
    );
    render(<SlotMachine />);
    fireEvent.click(screen.getByRole('button', { name: WORDS.labels.soundOff }));
    await tick(0);
    expect(resume).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: WORDS.labels.soundOn })).toHaveAttribute('aria-pressed', 'true');
    vi.unstubAllGlobals();
  });
});

describe('saving', () => {
  test('restores a saved game after mount', async () => {
    seed(
      returning({
        credits: 512,
        meter: 3,
        stats: { spins: 40, jackpots: 4, bestStreak: 5, moonTrips: 1, stars: 0, loans: 2 },
      }),
    );
    render(<SlotMachine />);
    await tick(0);
    expect(credits()).toBe(512);
    expect(screen.getByRole('img', { name: '512 credits' })).toBeInTheDocument();
    expect(stats()).toHaveTextContent('spins40');
    expect(stats()).toHaveTextContent('best streak5');
    expect(stats()).toHaveTextContent('moon trips1');
    expect(stats()).toHaveTextContent('moon loans2');
  });

  test.each(['{not json', '"a string"', 'null', '42'])('unreadable storage is a new game: %s', async (stored) => {
    window.localStorage.setItem(STORAGE_KEY, stored);
    render(<SlotMachine rng={landing(OPENING)} />);
    await tick(0);
    expect(credits()).toBe(START_CREDITS);
    await pull();
    expect(credits()).toBe(OPENED);
  });

  test('a mangled save still plays, without a second opening jackpot', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{"credits":"NaN","stats":7}');
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    expect(credits()).toBe(START_CREDITS);
    await pull();
    expect(credits()).toBe(START_CREDITS - COST);
  });

  test('when the credits run out the moon lends some and the pull goes ahead', async () => {
    seed(returning({ credits: COST - 2 }));
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    expect(credits()).toBe(COST - 2);
    await pull();
    expect(machine()).toHaveAttribute('data-loan', String(LOAN));
    expect(credits()).toBe(COST - 2 + LOAN - COST);
    expect(stats()).toHaveTextContent('moon loans1');
  });

  test('keeps playing when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(<SlotMachine rng={landing(OPENING, MISS)} />);
    await pull();
    expect(credits()).toBe(OPENED);
    await pull();
    expect(credits()).toBe(OPENED - COST);
  });

  test('keeps its progress when storage can be read but every write fails', async () => {
    seed(returning({ credits: 500, stats: { ...initialState().stats, spins: 10 } }));
    render(<SlotMachine rng={landing(MISS, MISS, MISS)} />);
    await tick(0);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await pull();
    await pull();
    await pull();
    // The stale stored save must not be mistaken for another tab's newer one.
    expect(credits()).toBe(500 - 3 * COST);
    expect(stats()).toHaveTextContent('spins13');
  });

  test('adopts a newer save made in another tab', async () => {
    seed(returning({ credits: 100 }));
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    const theirs = JSON.stringify(returning({ credits: 400 }));
    window.localStorage.setItem(STORAGE_KEY, theirs);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: theirs }));
    });
    expect(credits()).toBe(400);
    await pull();
    expect(saved().credits).toBe(400 - COST);
  });

  test('a stale tab pulls from the newer balance even if it never heard about it', async () => {
    seed(returning({ credits: 100 }));
    render(<SlotMachine rng={landing(MISS)} />);
    await tick(0);
    seed(returning({ credits: 400 }));
    await pull();
    expect(credits()).toBe(400 - COST);
    expect(saved().credits).toBe(400 - COST);
  });
});

describe('shooting star', () => {
  const star = () => screen.getByLabelText(WORDS.labels.star);
  // With every decorative roll at zero the first star is due 20 seconds after the first pull.
  const FIRST_STAR_MS = 20_000;

  test('no star comes before the first pull', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<SlotMachine rng={landing(OPENING)} />);
    await tick(120_000);
    expect(star()).not.toBeVisible();
  });

  test('stars start coming after a manual first pull, with no scrolling involved', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    seed(returning());
    render(<SlotMachine rng={landing(MISS)} />);
    fireEvent.click(lever());
    await tick(FIRST_STAR_MS - 1000);
    expect(star()).not.toBeVisible();
    await tick(1500);
    expect(star()).toBeVisible();
    // Left alone, it goes away again.
    await tick(7000);
    expect(star()).not.toBeVisible();
  });

  test('catching it pays a little and makes the next pull three of a kind', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    seed(returning({ credits: 100 }));
    // Miss; then the lucky pull draws a symbol (the first: crescent) and a position on each reel.
    render(<SlotMachine rng={landing(MISS, [0, 0, 0, 0])} />);
    fireEvent.click(lever());
    await tick(FIRST_STAR_MS + 500);
    const before = credits();

    fireEvent.click(star());
    await tick(0);
    expect(star()).not.toBeVisible();
    expect(credits()).toBe(before + STAR_BONUS);
    expect(sign()).toBe(`${WORDS.star} +${STAR_BONUS}`);
    expect(stats()).toHaveTextContent('stars caught1');
    expect(screen.getByRole('status')).toHaveTextContent(`${WORDS.announce.star} ${before + STAR_BONUS} credits.`);
    expect(saved()).toMatchObject({ lucky: true, credits: before + STAR_BONUS });

    await pull();
    expect(machine()).toHaveAttribute('data-kind', 'triple');
    expect(machine()).toHaveAttribute('data-line', 'crescent crescent crescent');
    expect(credits()).toBe(before + STAR_BONUS - COST + PAYTABLE.triple.crescent);
    expect(saved().lucky).toBe(false);
  });
});

describe('announcements', () => {
  test('each result is announced with the balance, so repeats are still read out', async () => {
    seed(returning({ credits: 41 }));
    render(<SlotMachine rng={landing(MISS, MISS, PAIR)} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    await pull();
    expect(status).toHaveTextContent('No match. 36 credits.');
    await pull();
    expect(status).toHaveTextContent('No match. 31 credits.');
    await pull();
    expect(status).toHaveTextContent('A pair: wave. 5 credits won. 31 credits.');
  });

  test('the announcement is cleared when a pull starts', async () => {
    seed(returning({ credits: 41 }));
    render(<SlotMachine rng={landing(MISS, MISS)} />);
    await pull();
    fireEvent.click(lever());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await settle();
    expect(screen.getByRole('status')).toHaveTextContent('No match. 31 credits.');
  });

  test('a loan and a full moon are announced too', async () => {
    seed(returning({ credits: 0 }));
    render(<SlotMachine rng={landing(LAUNCH)} />);
    fireEvent.click(lever());
    await tick(500);
    expect(screen.getByRole('status')).toHaveTextContent(`${WORDS.announce.loan} ${LOAN}.`);
    await settle();
    expect(screen.getByRole('status')).toHaveTextContent(
      `${WORDS.announce.fullMoon} ${LOAN - COST + PAYTABLE.launch} credits.`,
    );
  });
});

describe('with motion', () => {
  // A browser-like environment: matchMedia exists and nobody asked for reduced motion.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('the reels take their time, and the last one is held back when a win is on', async () => {
    seed(returning());
    render(<SlotMachine rng={landing(NEAR_MISS)} />);
    const cab = () => document.querySelector('[data-bulbs]');
    fireEvent.click(lever());
    await tick(300);
    expect(machine()).toHaveAttribute('data-busy', 'true');
    expect(cab()).toHaveAttribute('data-bulbs', 'spin');
    expect(machine()).not.toHaveAttribute('data-kind');

    // The first two reels have landed on a pair of waves; the third crawls in.
    await tick(1700);
    expect(sign()).toBe(WORDS.teasing);
    expect(cab()).toHaveAttribute('data-bulbs', 'tease');
    expect(machine()).toHaveAttribute('data-busy', 'true');

    await settle();
    expect(machine()).toHaveAttribute('data-busy', 'false');
    expect(machine()).toHaveAttribute('data-kind', 'pair');
    expect(sign()).not.toBe(WORDS.teasing);
    // The strip really is where the engine said: the payline cell of each reel shows the line.
    const strips = document.querySelectorAll<HTMLElement>('[data-symbol]:first-child');
    expect(strips).toHaveLength(3);
    NEAR_MISS.forEach((stop, reel) => {
      expect(strips[reel].parentElement?.style.transform).toContain(`* ${(-(stop + 1)).toFixed(4)}`);
    });
  });

  test('without a tease the pull is over sooner', async () => {
    seed(returning());
    render(<SlotMachine rng={landing(MISS)} />);
    fireEvent.click(lever());
    await tick(2600);
    expect(machine()).toHaveAttribute('data-kind', 'miss');
    expect(sign()).not.toBe(WORDS.teasing);
  });
});

test('cleans up its timers and listeners on unmount', async () => {
  const { unmount } = render(<SlotMachine rng={landing(OPENING)} />);
  fireEvent.click(lever());
  unmount();
  await vi.advanceTimersByTimeAsync(10000);
  expect(vi.getTimerCount()).toBe(0);
});

test('every line for the sign can be drawn in the pixel font', () => {
  const lines = [
    WORDS.waiting,
    ...WORDS.hints,
    WORDS.keyboardHint,
    WORDS.hintPair,
    WORDS.hintSevens,
    ...WORDS.spinning,
    WORDS.freeSpin,
    WORDS.teasing,
    WORDS.jackpot,
    WORDS.sevens,
    ...Object.values(WORDS.triple),
    WORDS.pair,
    WORDS.nearMiss,
    ...WORDS.miss,
    ...Object.values(WORDS.missBySymbol),
    WORDS.rocketMiss,
    WORDS.countdown,
    WORDS.liftoff,
    WORDS.toTheMoon,
    WORDS.andBack,
    WORDS.roundTrip,
    WORDS.roundTripCalm,
    WORDS.fullMoon,
    WORDS.freeSpins,
    WORDS.freeLeft,
    WORDS.moonset,
    WORDS.broke,
    WORDS.loan,
    WORDS.star,
    WORDS.streak,
  ];
  for (const line of lines) expect(canWrite(line), line).toBe(true);
  expect(canWrite('+0123456789 x2')).toBe(true);
  expect(canWrite('wipeout')).toBe(false);
});
