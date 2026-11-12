import { useEffect, useMemo, useRef, useState } from 'react';

import type { Round } from './beats';
import { type Aim, catchStar, type GameState, initialState, type Rng, spin } from './engine';
import { loadGame, parseGame, readRaw, saveGame, STORAGE_KEY } from './storage';

export type SlotGame = {
  /** The state the screen has caught up to. Everything shown is derived from this. */
  revealed: GameState;
  reveal: (state: GameState) => void;
  /** Decides and saves one pull; `aim` says whether the lever was let go on its target. Nothing on screen changes until it is revealed. */
  pull: (aim: Aim) => Round;
  /** Ends a pull: the screen now shows exactly what the engine holds. */
  settle: () => void;
  catchStar: () => void;
  /** The engine's state right now, for decisions made outside render. */
  current: () => GameState;
};

/**
 * The game itself: the engine's state, kept in a ref because it runs ahead of the screen, plus
 * saving and loading. The server and the first client render show a new game; a saved one is
 * loaded after mount.
 */
export function useSlotGame(rng: Rng): SlotGame {
  const [revealed, reveal] = useState<GameState>(initialState);
  const game = useRef<GameState>(revealed);
  const written = useRef<string | null>(null);
  /** The last save failed, so the stored copy is older than the game in memory. */
  const unsaved = useRef(false);
  const pulling = useRef(false);
  const latestRng = useRef(rng);

  useEffect(() => {
    latestRng.current = rng;
  }, [rng]);

  useEffect(() => {
    const adopt = (state: GameState) => {
      game.current = state;
      reveal(state);
    };
    const saved = loadGame();
    if (saved) adopt(saved);
    written.current = readRaw();

    // Another tab played: take its save rather than overwrite it with a stale balance.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || pulling.current) return;
      const theirs = parseGame(event.newValue);
      if (!theirs) return;
      written.current = event.newValue;
      adopt(theirs);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(() => {
    // The storage event can lag or be missed, so check again before spending from the balance.
    // If our own last write failed, what is stored is our stale save, not another tab's: keep playing.
    const adoptNewerSave = () => {
      if (unsaved.current) return;
      const raw = readRaw();
      if (raw === written.current) return;
      const theirs = parseGame(raw);
      if (theirs) game.current = theirs;
    };
    const commit = (state: GameState) => {
      game.current = state;
      const stored = saveGame(state);
      unsaved.current = stored === null;
      if (stored !== null) written.current = stored;
    };
    return {
      reveal,
      current: () => game.current,
      pull: (aim: Aim) => {
        adoptNewerSave();
        pulling.current = true;
        const before = game.current;
        const { state: after, outcome } = spin(before, latestRng.current, aim);
        commit(after);
        return { before, after, outcome };
      },
      settle: () => {
        pulling.current = false;
        reveal(game.current);
      },
      catchStar: () => {
        adoptNewerSave();
        commit(catchStar(game.current));
        reveal(game.current);
      },
    };
  }, []);

  return useMemo(() => ({ revealed, ...actions }), [revealed, actions]);
}
