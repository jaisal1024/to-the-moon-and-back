import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { beats } from './beats';
import { lendCredits, OPENING_SHOW, type Pulse, revealRound, type Show, type Stage } from './choreography';
import { type Aim, FREE_MULTIPLIER, FUMBLE_COST, PAYTABLE, STAR_BONUS } from './engine';
import { chance, pick } from './motion';
import type { Particles } from './useParticles';
import type { Reels } from './useReels';
import type { Ship } from './useShip';
import { useShootingStar } from './useShootingStar';
import type { SlotGame } from './useSlotGame';
import type { Sound } from './useSound';
import type { Timers } from './useTimers';
import { WORDS } from './words';

/** What started a pull. */
export type Source = 'scroll' | 'lever' | 'reels';

type Cast = {
  game: SlotGame;
  reels: Reels;
  particles: Particles;
  sound: Sound;
  fly: Ship['fly'];
  timers: Timers;
  spots: Stage['spots'];
  onScreen: RefObject<boolean>;
};

const LEVER_DOWN_MS = 150;
const HINT_AFTER_MS = 2600;
const FLOAT_MS = 1500;

const hints = () => {
  const keyboard = typeof window.matchMedia === 'function' && !window.matchMedia('(hover: none)').matches;
  return [
    ...WORDS.hints,
    ...(keyboard ? [WORDS.keyboardHint] : []),
    `${WORDS.hintPair} +${PAYTABLE.pair}`,
    `${WORDS.hintSevens} +${PAYTABLE.triple.seven}`,
    `${WORDS.hintFumble} -${FUMBLE_COST}`,
  ];
};

/**
 * Runs the show around the game: takes a pull from the engine, then reveals it beat by beat
 * through the reels, the sign, the counters and the effects. Returns the presentation state,
 * `play` to pull the lever, and the shooting star.
 */
export function useShow({ game, reels, particles, sound, fly, timers, spots, onScreen }: Cast) {
  const [show, setShow] = useState<Show>(OPENING_SHOW);
  const busy = useRef(false);
  const floatId = useRef(0);
  const { pull, settle, reveal, current, catchStar } = game;

  const mayStarAppear = useCallback(
    () => !busy.current && onScreen.current && !current().lucky && current().freeSpins === 0,
    [current, onScreen],
  );
  const star = useShootingStar(timers, mayStarAppear);
  const { start: startStars, dismiss: dismissStar } = star;

  const stage = useMemo<Stage>(() => {
    const set: Stage['set'] = (change) => setShow((s) => ({ ...s, ...change }));
    return {
      ...timers,
      set,
      say: (text, tone) => setShow((s) => ({ ...s, sign: { text, tone, beat: s.sign.beat + 1 } })),
      pulse: (name: Pulse) => setShow((s) => ({ ...s, pulses: { ...s.pulses, [name]: s.pulses[name] + 1 } })),
      float: (text, big) => {
        const id = ++floatId.current;
        setShow((s) => ({ ...s, floats: [...s.floats, { id, text, big }] }));
        timers.later(() => setShow((s) => ({ ...s, floats: s.floats.filter((f) => f.id !== id) })), FLOAT_MS);
      },
      reveal,
      reels,
      particles,
      sound,
      fly,
      spots,
    };
  }, [timers, reveal, reels, particles, sound, fly, spots]);

  // While nobody is pulling, the sign cycles through hints and the lever beckons.
  const hinting = useRef({ timer: undefined as ReturnType<typeof setTimeout> | undefined, shown: 0 });
  const attract = useMemo(() => {
    const next = () => {
      if (busy.current) return;
      const lines = hints();
      const { shown } = hinting.current;
      const free = current().freeSpins;
      if (free > 0) stage.say(`${free} ${WORDS.freeLeft} x${FREE_MULTIPLIER}`, 'plum');
      else stage.say(lines[shown % lines.length], 'dim');
      stage.set({ bulbs: 'idle' });
      if (shown % 3 === 0) stage.pulse('nudge');
      hinting.current.shown++;
      hinting.current.timer = timers.later(next, HINT_AFTER_MS);
    };
    const stop = () => clearTimeout(hinting.current.timer);
    const start = () => {
      stop();
      hinting.current.timer = timers.later(next, HINT_AFTER_MS);
    };
    return { start, stop };
  }, [stage, timers, current]);

  const play = useCallback(
    async (_source: Source, aim: Aim = 'none') => {
      if (busy.current) return;
      busy.current = true;
      attract.stop();
      // The pull is decided and saved here, before anything moves. The rest only shows it.
      const round = pull(aim);
      const { outcome } = round;
      startStars();
      dismissStar();
      stage.set({ busy: true, hits: null, announce: '', leverDown: true });
      timers.later(() => stage.set({ leverDown: false }), LEVER_DOWN_MS);
      try {
        if (outcome.loan) await lendCredits(stage, round);
        reveal(beats.pulled(round));
        if (outcome.perfect) {
          stage.say(WORDS.perfect, 'hot');
          sound.tune([784, 1175], 0.05, 'square', 0.05);
          navigator.vibrate?.(30);
        } else if (outcome.fumbled) {
          stage.say(outcome.cost ? `${WORDS.fumbled} -${outcome.cost}` : WORDS.fumbled, 'hot');
          sound.blip(140, 0.2, 'sawtooth', 0.05, 0, 70);
        } else {
          stage.say(outcome.free ? WORDS.freeSpin : pick(WORDS.spinning), 'dim');
        }
        stage.set({ bulbs: 'spin' });
        sound.blip(180, 0.25, 'sawtooth', 0.04, 0, 520);
        await reels.spinTo(outcome.stops, {
          tease: outcome.tease,
          onTease: () => {
            stage.set({ bulbs: 'tease' });
            stage.say(WORDS.teasing, 'hot');
          },
        });
        await revealRound(stage, round);
      } finally {
        // Whatever happened on screen, end in step with the engine.
        busy.current = false;
        settle();
        stage.set({ busy: false, rumbling: false, last: outcome });
        attract.start();
      }
    },
    [attract, pull, settle, reveal, startStars, dismissStar, stage, timers, sound, reels],
  );

  const catchTheStar = useCallback(
    (starElement: Element) => {
      if (busy.current) return;
      const at = particles.spot(starElement);
      dismissStar();
      catchStar();
      for (let i = 0; i < 26; i++)
        particles.spark(at, (chance() - 0.5) * 9, (chance() - 0.5) * 9, 18 + Math.floor(chance() * 18));
      sound.tune([988, 1319, 1976], 0.06, 'triangle', 0.07);
      stage.pulse('bump');
      stage.say(`${WORDS.star} +${STAR_BONUS}`, 'jack');
      stage.set({ announce: `${WORDS.announce.star} ${current().credits} ${WORDS.labels.credits}.` });
      attract.start();
    },
    [attract, catchStar, current, dismissStar, particles, sound, stage],
  );

  return { show, play, star: { mode: star.mode, onCatch: catchTheStar, onGone: dismissStar } };
}
