/*
 * Pixel art for the slot machine, in the same language as the moon in the top bar: every drawing is
 * rows of characters turned into one SVG path of 1-high rectangles. Pure data and string building.
 */
import type { SymbolId } from './engine';

/** Which ink a layer is drawn in. The colours live in slots.module.css. */
export type Tone = 'blue' | 'violet' | 'plum' | 'ink';

/** One path for every `mark` character in the rows, merging horizontal runs. */
function runs(rows: readonly string[], mark = '#', offsetX = 0): string {
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== mark) continue;
      const start = x;
      while (row[x + 1] === mark) x++;
      const length = x - start + 1;
      d += `M${start + offsetX} ${y}h${length}v1h-${length}z`;
    }
  });
  return d;
}

function disc(size: number, keep: (x: number, y: number, centre: number, radius: number) => boolean): string[] {
  const centre = (size - 1) / 2;
  const radius = centre + 0.3;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) =>
      Math.hypot(x - centre, y - centre) <= radius && keep(x, y, centre, radius) ? '#' : '.',
    ).join(''),
  );
}

const CRATERS = new Set(['4,3', '5,3', '4,4', '8,6', '9,6', '9,7', '8,7', '4,9', '6,10', '9,3']);

// 13 x 13 each. '#' is the first tone, 'o' the second.
// prettier-ignore
const ART: Record<SymbolId, { tones: [Tone, Tone?]; rows: string[] }> = {
  crescent: { tones: ['blue'], rows: disc(13, (x, y, c, r) => Math.hypot(x - c - 4.2, y - c) > r) },
  moon: { tones: ['plum'], rows: disc(13, (x, y) => !CRATERS.has(`${x},${y}`)) },
  wave: { tones: ['blue', 'violet'], rows: [
    '.............', '.....#####...', '...########..', '..####...###.', '.###......##.', '.###.....###.', '###......##..',
    '###..........', '####.........', '#####.....o..', '#######..ooo.', 'ooooooooooooo', 'ooooooooooooo'] },
  palm: { tones: ['blue', 'ink'], rows: [
    '.............', '..##...###...', '.####.#####..', '##.#####..##.', '#..####....#.', '..##.o###....', '.##..o..##...',
    '.#...oo..#...', '......o......', '......oo.....', '.......o.....', '.......oo....', '....ooooooo..'] },
  camera: { tones: ['ink', 'blue'], rows: [
    '.............', '..###........', '..###...oo...', '#############', '#############', '####.....####', '###..ooo..###',
    '###.ooooo.###', '###.ooooo.###', '###..ooo..###', '####.....####', '#############', '.............'] },
  book: { tones: ['plum', 'ink'], rows: [
    '.............', '.............', '.#####.#####.', '#.....#.....#', '#.ooo.#.ooo.#', '#.....#.....#', '#.ooo.#.ooo.#',
    '#.....#.....#', '#.oo..#.ooo.#', '#.....#.....#', '######.######', '.....###.....', '.............'] },
  seven: { tones: ['plum'], rows: [
    '.............', '.###########.', '.###########.', '.###########.', '.##....#####.', '.......####..', '......####...',
    '.....####....', '....####.....', '....####.....', '...####......', '...####......', '.............'] },
  rocket: { tones: ['blue', 'plum'], rows: [
    '......#......', '.....###.....', '....#####....', '....#####....', '....##.##....', '....##.##....', '....#####....',
    '...#######...', '..#########..', '..##.###.##..', '..#..ooo..#..', '.....ooo.....', '......o......'] },
};

export const ICON_SIZE = 13;

/** Each symbol as layers of { tone, d } on a 13 x 13 grid. */
export const ICONS = Object.fromEntries(
  Object.entries(ART).map(([id, { tones, rows }]) => [
    id,
    tones.flatMap((tone, i) => (tone ? [{ tone, d: runs(rows, i === 0 ? '#' : 'o') }] : [])),
  ]),
) as Record<SymbolId, { tone: Tone; d: string }[]>;

// 5 x 7 pixel type, variable width, rows separated by '/'.
// prettier-ignore
const FONT: Record<string, string[]> = Object.fromEntries(Object.entries({
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.', C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.', E: '#####/#..../#..../####./#..../#..../#####', F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#', I: '###/.#./.#./.#./.#./.#./###',
  J: '..###/...#./...#./...#./...#./#..#./.##..', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....', Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..', U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '.#./##./.#./.#./.#./.#./###', 2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.', 4: '...#./..##./.#.#./#..#./#####/...#./...#.', 5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '..##./.#.../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../.#.../.#.../.#...', 8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/...#./.##..', '+': '...../..#../..#../#####/..#../..#../.....', '-': '..../..../..../####/..../..../....',
  '!': '#/#/#/#/#/./#', '?': '.###./#...#/....#/...#./..#../...../..#..', '.': './././././././#', ' ': '../../../../../../..',
  // lower-case x is the multiplication sign
  x: '...../...../#...#/.#.#./..#../.#.#./#...#',
}).map(([char, rows]) => [char, rows.split('/')]));

/** True when every character has a glyph, so a typo in the words can't print a blank. */
export function canWrite(text: string): boolean {
  return [...text].every((char) => char in FONT);
}

/** A line of pixel type as one path, 7 units tall and `width` units wide. */
export function write(text: string): { d: string; width: number } {
  let d = '';
  let x = 0;
  for (const char of text) {
    const glyph = FONT[char] ?? FONT[' '];
    d += runs(glyph, '#', x);
    x += glyph[0].length + 1;
  }
  return { d, width: Math.max(1, x - 1) };
}

export const COIN = runs(['..###..', '.#####.', '##.#.##', '##.#.##', '##.#.##', '.#####.', '..###..']);
const STAR_ROWS = ['...#...', '...#...', '.#####.', '#######', '.#####.', '..#.#..', '.#...#.'];
export const STAR = runs(STAR_ROWS);
/** The star again, shifted right to sit at the head of the shooting star's tail (15 x 7). */
export const STAR_HEAD = runs(STAR_ROWS, '#', 8);
export const KNOB = runs(disc(9, () => true));
// prettier-ignore
export const SPEAKER = {
  on: runs(['...#.....', '..##..#..', '####...#.', '####.#.#.', '####...#.', '..##..#..', '...#.....']),
  off: runs(['...#.....', '..##.....', '####.#.#.', '####..#..', '####.#.#.', '..##.....', '...#.....']),
};

const ORB_CRATERS = new Set(['9,4', '10,4', '10,5', '6,8', '7,8', '7,9', '10,10', '4,5']);
export const ORB_SIZE = 15;

/** The meter moon at a fraction 0..1, waxing from the right limb: the unlit disc and the lit part. */
export function orb(fraction: number): { dark: string; lit: string } {
  const centre = 7;
  const radius = 7.3;
  const dark: string[] = [];
  const lit: string[] = [];
  for (let y = 0; y < ORB_SIZE; y++) {
    let a = '';
    let b = '';
    const half = Math.sqrt(Math.max(0, radius * radius - (y - centre) * (y - centre)));
    for (let x = 0; x < ORB_SIZE; x++) {
      const inside = Math.hypot(x - centre, y - centre) <= radius;
      const terminator = centre + half * Math.cos(Math.PI * fraction) - 0.01;
      const on = inside && fraction > 0 && x >= terminator && !ORB_CRATERS.has(`${x},${y}`);
      a += inside && !on ? '#' : '.';
      b += on ? '#' : '.';
    }
    dark.push(a);
    lit.push(b);
  }
  return { dark: runs(dark), lit: runs(lit) };
}
