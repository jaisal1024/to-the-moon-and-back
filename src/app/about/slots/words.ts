import type { SymbolId } from './engine';

/*
 * ============================================================================================
 *  EVERY WORD THE SLOT MACHINE SAYS. Edit freely.
 *
 *  The sign is pixel type: capitals, digits, spaces and + - ! ? . only, plus a lower-case x
 *  as the multiplication sign (pixels.ts has the glyphs, and a test fails on anything else).
 *  Keep sign lines to about 20 characters so they stay readable on a phone.
 * ============================================================================================
 */
export const WORDS = {
  /** On the sign before the first pull. */
  waiting: 'TO THE MOON',
  /** Cycled on the sign while the machine is idle. The payouts are appended by the game. */
  hints: ['PULL THE LEVER', 'TAP THE REELS', 'ROCKETS GO WHERE?', 'WINS FEED THE MOON', 'CATCH A STAR'],
  /** Added to the hints on devices with a keyboard. Space works once the lever has focus. */
  keyboardHint: 'OR PRESS SPACE',
  hintPair: 'PAIR',
  hintSevens: '777',
  /** One is picked while the reels turn. */
  spinning: ['HERE WE GO', 'COME ON', 'SPINNING', 'MOON PLEASE', 'GOOD LUCK'],
  freeSpin: 'FREE SPIN',
  /** While the last reel is still turning with a win on the cards. */
  teasing: '. . .',

  jackpot: 'JACKPOT',
  sevens: '777',
  /** Shown after JACKPOT, by symbol. */
  triple: {
    crescent: 'NEW MOON CLUB',
    moon: 'MOONSTRUCK',
    wave: 'PERFECT SET',
    palm: 'ENDLESS SUMMER',
    camera: 'CONTACT SHEET',
    book: 'A TRILOGY',
    seven: 'LUCKY SEVENS',
    rocket: 'LIFTOFF',
  } satisfies Record<SymbolId, string>,
  pair: 'PAIR',
  nearMiss: 'SO CLOSE',
  /** A miss picks one of these, or the line for a symbol that is on the payline. */
  miss: ['NOPE', 'AGAIN', 'SO IT GOES', 'THE MOON SHRUGS', 'NOT THIS TIME', 'ONE MORE'],
  missBySymbol: {
    wave: 'WIPEOUT',
    palm: 'NO SHADE',
    camera: 'OUT OF FOCUS',
    book: 'PLOT TWIST',
  } as Partial<Record<SymbolId, string>>,
  /** A miss with two rockets showing and the third just out of view. */
  rocketMiss: 'SCRUBBED',

  /** The rocket sequence: countdown prefix (T-3, T-2, T-1), then the trip. */
  countdown: 'T-',
  liftoff: 'LIFTOFF',
  toTheMoon: 'TO THE MOON',
  andBack: 'AND BACK',
  roundTrip: 'ROUND TRIP',
  /** With reduced motion the trip is told, not flown. */
  roundTripCalm: 'TO THE MOON AND BACK',

  fullMoon: 'FULL MOON',
  /** Follows the number of free spins, e.g. "3 FREE SPINS x2". */
  freeSpins: 'FREE SPINS',
  /** Follows the number left, e.g. "2 FREE". */
  freeLeft: 'FREE',
  moonset: 'MOONSET',

  broke: 'BROKE?',
  /** Followed by the loan amount. */
  loan: 'MOON SPOTS YOU',
  star: 'LUCKY STAR',
  /** Follows the streak length, e.g. "3 IN A ROW". */
  streak: 'IN A ROW',

  /** The small text beside the machine. */
  stats: {
    spins: 'spins',
    jackpots: 'jackpots',
    bestStreak: 'best streak',
    moonTrips: 'moon trips',
    stars: 'stars caught',
    loans: 'moon loans',
  },

  /** Names for buttons and screen readers. */
  labels: {
    game: 'Moon slots, a small game',
    lever: 'Pull the lever',
    reels: 'Spin the reels',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    star: 'Catch the shooting star',
    credits: 'credits',
  },
  symbols: {
    crescent: 'crescent moon',
    moon: 'full moon',
    wave: 'wave',
    palm: 'palm tree',
    camera: 'camera',
    book: 'book',
    seven: 'seven',
    rocket: 'rocket',
  } satisfies Record<SymbolId, string>,
  /** Read out by screen readers after each pull. */
  announce: {
    launch: 'Three rockets. To the moon and back.',
    jackpot: 'Jackpot. Three of a kind:',
    pair: 'A pair:',
    miss: 'No match.',
    won: 'credits won.',
    loan: 'Out of credits. The moon lends you',
    fullMoon: 'Full moon. Free spins at double.',
    star: 'Caught a shooting star. The next pull is a sure thing.',
  },
};
