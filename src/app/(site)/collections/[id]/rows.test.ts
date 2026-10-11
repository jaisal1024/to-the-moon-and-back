import { describe, expect, test } from 'vitest';

import { formatMonth, groupPhotos, kindOf, type PhotoSize } from './rows';

const L: PhotoSize = { width: 6000, height: 3376 };
const P: PhotoSize = { width: 3375, height: 5999 };
const shapes = (s: string) => s.split('').map((c) => (c === 'L' ? L : P));
const kinds = (s: string) => groupPhotos(shapes(s)).map((r) => r.kind);

describe('groupPhotos', () => {
  test('returns nothing for an empty collection', () => {
    expect(groupPhotos([])).toEqual([]);
  });

  test('a single landscape is a full-bleed lead; a single portrait sits beside the title', () => {
    expect(kinds('L')).toEqual(['full']);
    expect(kinds('P')).toEqual(['lead']);
  });

  test('keeps every photo exactly once, in order', () => {
    for (const s of ['LLLPPLPLP', 'LPPLLPLP', 'PPPPPPP', 'LLLLLLLLP', 'LLPPLPPP', 'LLPPLLP', 'LPPLLPL', 'LP', 'PL']) {
      const rows = groupPhotos(shapes(s));
      expect(rows.reduce((n, r) => n + r.count, 0)).toBe(s.length);
      rows.forEach((r, i) => expect(r.start).toBe(i === 0 ? 0 : rows[i - 1].start + rows[i - 1].count));
    }
  });

  test('production collections avoid lone portraits after the lead', () => {
    // Nica 1, The Range of LA, Qasr al-Hosn, Slaughterhouse Abu Dhabi, Cuba, Uruguay in Summer, Nica 2
    for (const s of ['LLLPPLPLP', 'LPPLLPLP', 'PPPPPPP', 'LLLLLLLLP', 'LLPPLPPP', 'LLPPLLP', 'LPPLLPL']) {
      expect(
        groupPhotos(shapes(s))
          .slice(1)
          .map((r) => r.kind),
      ).not.toContain('solo');
    }
  });

  test('Nica 1 opens full-bleed and closes on a trio', () => {
    expect(kinds('LLLPPLPLP')).toEqual(['full', 'll', 'pp', 'full', 'trio']);
  });

  test('an all-portrait series opens on one lead plate, then rows of portraits', () => {
    const rows = groupPhotos(shapes('PPPPPPP'));
    expect(rows[0]).toEqual({ kind: 'lead', start: 0, count: 1 });
    rows.slice(1).forEach((r) => expect(['pp', 'ppp']).toContain(r.kind));
  });

  test('neighbouring rows rarely share a shape', () => {
    const k = kinds('LLLLLLLLP');
    k.slice(1).forEach((kind, i) => expect(kind).not.toBe(k[i]));
  });
});

test('kindOf rejects rows of three with two landscapes', () => {
  expect(kindOf([L, L, P])).toBeNull();
  expect(kindOf([P, L, P])).toBe('trio');
});

test('formatMonth reads the month and year from an ISO date', () => {
  expect(formatMonth('2023-04-19')).toBe('April 2023');
  expect(formatMonth('2024-12-01')).toBe('December 2024');
  expect(formatMonth(null)).toBeUndefined();
  expect(formatMonth('soon')).toBeUndefined();
});
