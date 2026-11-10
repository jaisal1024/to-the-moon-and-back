'use client';

import { useCallback, useMemo, useRef } from 'react';

import { METER_MAX, type Rng } from './engine';
import { Hud } from './Hud';
import { Lever } from './Lever';
import { useReplay } from './motion';
import { Orb } from './Orb';
import { Icon } from './Pixel';
import { Reels } from './Reels';
import { ShootingStar } from './ShootingStar';
import { Sign } from './Sign';
import styles from './slots.module.css';
import { StatsBar } from './StatsBar';
import { useCountUp } from './useCountUp';
import { useFrameLoop } from './useFrameLoop';
import { useParticles } from './useParticles';
import { cellIndex, cellKey, useReels } from './useReels';
import { useOnScreen, useScrollEntrance } from './useScrollEntrance';
import { useShip } from './useShip';
import { type Source, useShow } from './useShow';
import { useSky } from './useSky';
import { useSlotGame } from './useSlotGame';
import { useSound } from './useSound';
import { useTimers } from './useTimers';
import { WORDS } from './words';

const mathRandom: Rng = () => Math.random();

/**
 * The slot machine in the about page's night chapter.
 *
 * engine.ts holds the rules and decides every pull. This component composes the pieces that show
 * it: one frame loop (useFrameLoop) drives the reels, the coin canvas, the ship and the counter;
 * useShow reveals each pull beat by beat (choreography.ts); everything else is plain markup.
 * `rng` is the random source for the reels, injectable for tests.
 */
export default function SlotMachine({ rng = mathRandom }: { rng?: Rng }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const machineRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const coinsRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loop = useFrameLoop();
  const timers = useTimers();
  const sound = useSound();
  const particles = useParticles(loop, canvasRef);
  const reels = useReels(loop, sound.blip);
  const { shipRef, flying, fly } = useShip(loop, particles);
  const game = useSlotGame(rng);
  const [nearSky, farSky] = useSky(sectionRef);
  const onScreen = useOnScreen(sectionRef);

  const spots = useMemo(
    () => ({ reels: () => windowRef.current, moon: () => orbRef.current, purse: () => coinsRef.current }),
    [],
  );
  const { show, play, star } = useShow({ game, reels, particles, sound, fly, timers, spots, onScreen });

  const pull = useCallback((source: Source) => void play(source), [play]);
  // Scrolling the machine into place plays a new visitor's free opening pull. Nothing is ever
  // spent without a hand on the lever, so once the opening is behind them, arriving does nothing.
  const { current } = game;
  const pullOnArrival = useCallback(() => {
    if (current().opening) pull('scroll');
  }, [current, pull]);
  useScrollEntrance(loop, sectionRef, stageRef, pullOnArrival);

  const { revealed } = game;
  const { blip } = sound;
  const counter = useCountUp(
    loop,
    revealed.credits,
    useCallback((shown: number) => blip(880 + (shown % 5) * 60, 0.03, 'square', 0.025), [blip]),
  );
  useReplay(machineRef, show.pulses.shake, 'shake');
  useReplay(machineRef, show.pulses.bigShake, 'shake', 3);
  useReplay(flashRef, show.pulses.flash, 'flash');

  // The free spins last exactly as long as the moon is full.
  const moonlit = revealed.meter === METER_MAX;
  const { last } = show;
  // While the ship is flying, the middle reel's rocket is not in its cell.
  const away = flying && last?.kind === 'launch' ? cellKey(1, cellIndex(last.stops[1], last.cells[1][1])) : null;

  return (
    <section ref={sectionRef} className={styles.game} aria-label={WORDS.labels.game}>
      <div
        className={styles.pin}
        data-testid="slot-machine"
        data-busy={show.busy}
        data-credits={revealed.credits}
        data-spins={revealed.stats.spins}
        data-kind={last?.kind}
        data-line={last?.line.join(' ')}
        data-cost={last?.cost}
        data-loan={last?.loan}
        data-payout={last?.payout}
        data-moonlit={moonlit || undefined}
      >
        <i ref={nearSky} className={styles.sky} aria-hidden="true" />
        <i ref={farSky} className={styles.sky} aria-hidden="true" />
        <i className={styles.glow} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.fx} aria-hidden="true" />

        <div ref={stageRef} className={styles.stage}>
          <Orb orbRef={orbRef} meter={revealed.meter} pop={show.pulses.pop} jig={show.pulses.jig} />
          <Hud
            coinsRef={coinsRef}
            credits={revealed.credits}
            shown={counter.value}
            falling={counter.falling}
            bump={show.pulses.bump}
            streak={revealed.streak}
            moonlit={moonlit}
            freeSpins={revealed.freeSpins}
            lucky={revealed.lucky}
          />
          <div ref={machineRef} className={styles.machine} data-rumble={show.rumbling || undefined}>
            <div className={styles.cab} data-bulbs={show.bulbs}>
              <Sign sign={show.sign} />
              <Reels
                windowRef={windowRef}
                strips={reels.strips}
                hits={show.hits}
                away={away}
                floats={show.floats}
                onPull={() => pull('reels')}
              />
            </div>
            <Lever down={show.leverDown} nudge={show.pulses.nudge} onPull={pull} />
          </div>
          <StatsBar stats={revealed.stats} soundOn={sound.on} onToggleSound={sound.toggle} />
        </div>

        <div ref={shipRef} className={styles.ship} hidden={!flying} aria-hidden="true">
          <Icon symbol="rocket" />
        </div>
        <ShootingStar mode={star.mode} onCatch={star.onCatch} onGone={star.onGone} />
        <i ref={flashRef} className={styles.flash} aria-hidden="true" />
        <p className={styles.sr} role="status">
          {show.announce}
        </p>
      </div>
    </section>
  );
}
