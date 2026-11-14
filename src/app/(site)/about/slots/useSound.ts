import { useEffect, useMemo, useRef, useState } from 'react';

export type Sound = {
  on: boolean;
  toggle: () => void;
  /** One short note. `slideTo` glides the pitch. Silent while the sound is off. */
  blip: (
    freq: number,
    seconds: number,
    type?: OscillatorType,
    volume?: number,
    delay?: number,
    slideTo?: number,
  ) => void;
  /** A run of notes, `step` seconds apart. */
  tune: (notes: number[], step: number, type?: OscillatorType, volume?: number) => void;
};

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Web Audio blips. Off until the visitor asks for it, and quietly absent where audio is not available. */
export function useSound(): Sound {
  const [on, setOn] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const enabled = useRef(false);

  useEffect(
    () => () => {
      context.current?.close().catch(() => {});
      context.current = null;
    },
    [],
  );

  const controls = useMemo(() => {
    const blip: Sound['blip'] = (freq, seconds, type = 'square', volume = 0.05, delay = 0, slideTo = 0) => {
      const audio = context.current;
      if (!enabled.current || !audio) return;
      try {
        const start = audio.currentTime + delay;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, start);
        if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + seconds + 0.02);
      } catch {
        // Sound is a nicety; a failed note is not worth interrupting the game for.
      }
    };
    const tune: Sound['tune'] = (notes, step, type = 'square', volume = 0.05) =>
      notes.forEach((note, i) => blip(note, step * 1.6, type, volume, i * step));
    const toggle = () => {
      let next = !enabled.current;
      if (next) {
        try {
          const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
          context.current ??= new AudioCtor();
          // Browsers may refuse to start audio; the toggle then simply stays quiet.
          context.current.resume().catch(() => {});
        } catch {
          next = false;
        }
      }
      enabled.current = next;
      setOn(next);
      blip(660, 0.08);
      blip(990, 0.1, 'square', 0.05, 0.08);
    };
    return { blip, tune, toggle };
  }, []);

  return useMemo(() => ({ on, ...controls }), [on, controls]);
}
