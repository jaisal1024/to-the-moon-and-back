// Row grouping for a collection page. Pure, so it can be unit tested without layout.
//
// The first photo is the lead plate: a landscape runs full-bleed under the title, a portrait sits in the
// title's meta row (as the portrait does on /about). The rest are grouped, in order, into rows that suit
// their orientations. The cheapest grouping wins: a lone portrait is a last resort, and repeating the
// previous row's shape costs extra so the rhythm keeps changing.

export type PhotoSize = { width: number; height: number };

export type RowKind =
  | 'lead' // portrait lead, shown beside the title
  | 'full' // one landscape, edge to edge
  | 'll' // two landscapes
  | 'pp' // two portraits
  | 'mix' // a landscape and a portrait
  | 'ppp' // three portraits
  | 'trio' // three photos with one landscape
  | 'solo'; // one portrait on its own

export type Row = { kind: RowKind; start: number; count: number };

const COST: Record<Exclude<RowKind, 'lead'>, number> = { full: 1, ll: 1, pp: 1, mix: 1, ppp: 1.4, trio: 1.4, solo: 6 };
const REPEAT_COST = 2;

const isPortrait = (p: PhotoSize) => p.width < p.height;
export const aspect = (p: PhotoSize) => (p.width > 0 && p.height > 0 ? p.width / p.height : 3 / 2);

export function kindOf(group: PhotoSize[]): Exclude<RowKind, 'lead'> | null {
  const portraits = group.filter(isPortrait).length;
  const landscapes = group.length - portraits;
  if (group.length === 1) return landscapes ? 'full' : 'solo';
  if (group.length === 2) return landscapes === 2 ? 'll' : portraits === 2 ? 'pp' : 'mix';
  if (group.length === 3) return landscapes === 0 ? 'ppp' : landscapes === 1 ? 'trio' : null;
  return null;
}

export function groupPhotos(photos: PhotoSize[]): Row[] {
  if (!photos.length) return [];
  const leadKind: RowKind = isPortrait(photos[0]) ? 'lead' : 'full';
  const memo = new Map<string, { cost: number; rows: Row[] }>();

  function plan(start: number, prev: RowKind): { cost: number; rows: Row[] } {
    if (start >= photos.length) return { cost: 0, rows: [] };
    const key = `${start}:${prev}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best: { cost: number; rows: Row[] } | null = null;
    for (let count = 1; count <= 3 && start + count <= photos.length; count++) {
      const kind = kindOf(photos.slice(start, start + count));
      if (!kind) continue;
      const rest = plan(start + count, kind);
      const cost = COST[kind] + (kind === prev ? REPEAT_COST : 0) + rest.cost;
      if (!best || cost < best.cost) best = { cost, rows: [{ kind, start, count }, ...rest.rows] };
    }
    // Every single photo is a valid row, so there is always a plan.
    memo.set(key, best!);
    return best!;
  }

  return [{ kind: leadKind, start: 0, count: 1 }, ...plan(1, leadKind === 'lead' ? 'solo' : 'full').rows];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// "2023-04-19" -> "April 2023", read from the string so time zones can't shift the month.
export function formatMonth(date?: string | null) {
  const match = /^(\d{4})-(\d{2})/.exec(date ?? '');
  if (!match) return undefined;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : undefined;
}
