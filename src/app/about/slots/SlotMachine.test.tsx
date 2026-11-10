import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  COST,
  FREE_MULTIPLIER,
  FREE_SPINS,
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

describe('controls', () => {
  test('space and enter pull only from the reels, and the page keeps its own keys', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS, MISS)} />);
    const reels = screen.getByRole('button', { name: WORDS.labels.reels });

    fireEvent.keyDown(document.body, { key: ' ' });
    await settle();
    expect(stats()).toHaveTextContent('spins0');

    expect(fireEvent.keyDown(reels, { key: ' ' })).toBe(false); // handled, so the page does not scroll
    await settle();
    fireEvent.keyDown(reels, { key: 'Enter' });
    await settle();
    expect(stats()).toHaveTextContent('spins2');
    expect(fireEvent.keyDown(reels, { key: 'ArrowDown' })).toBe(true);
  });

  test('holding a key down is one pull, not a stream of them', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS, MISS)} />);
    const reels = screen.getByRole('button', { name: WORDS.labels.reels });
    fireEvent.keyDown(reels, { key: ' ' });
    await settle();
    fireEvent.keyDown(reels, { key: ' ', repeat: true });
    await settle();
    expect(stats()).toHaveTextContent('spins1');
    // On the lever a held Enter would repeat the button's click; the repeat is cancelled.
    expect(fireEvent.keyDown(lever(), { key: 'Enter', repeat: true })).toBe(false);
    expect(fireEvent.keyDown(lever(), { key: 'Enter' })).toBe(true);
  });

  test('dragging the lever past half way pulls once; the click that follows is not a second pull', async () => {
    render(<SlotMachine rng={landing(OPENING, MISS)} />);
    fireEvent.pointerDown(lever(), { clientY: 10 });
    fireEvent.pointerMove(lever(), { clientY: 120 });
    expect(lever()).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerUp(lever());
    fireEvent.click(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins1');
    expect(lever()).not.toHaveAttribute('data-dragging');
  });

  test('a cancelled drag puts the lever back without pulling', async () => {
    render(<SlotMachine rng={landing(OPENING)} />);
    fireEvent.pointerDown(lever(), { clientY: 10 });
    fireEvent.pointerMove(lever(), { clientY: 120 });
    fireEvent.pointerCancel(lever());
    await settle();
    expect(stats()).toHaveTextContent('spins0');
    expect(lever()).not.toHaveAttribute('data-dragging');
    expect(lever().style.getPropertyValue('--pull')).toBe('0');
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
