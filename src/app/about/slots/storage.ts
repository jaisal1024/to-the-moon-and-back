import { fromSaved, type GameState } from './engine';

/** Bumped when the saved shape changes. v2 added the opening pull and the streak. */
export const STORAGE_KEY = 'moon-slots:v2';
const OLDER_KEYS = ['moon-slots:v1'];

/** The stored text for the current save, or null when there is none or storage is off limits. */
export function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** A game parsed from stored text; null if the text is missing or not JSON. */
export function parseGame(raw: string | null): GameState | null {
  if (raw === null) return null;
  try {
    return fromSaved(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** The saved game, migrating an older save if that is all there is. Null for a new visitor. */
export function loadGame(): GameState | null {
  const current = parseGame(readRaw());
  if (current) return current;
  try {
    for (const key of OLDER_KEYS) {
      // Older saves never recorded the opening pull, so fromSaved treats it as taken.
      const older = parseGame(window.localStorage.getItem(key));
      if (older) return older;
    }
  } catch {
    // Private mode: play without saving.
  }
  return null;
}

/**
 * Saves the game and returns the text written, so a later change by another tab can be told apart.
 * Null when the write failed (storage full or off limits); the game still plays, unsaved.
 */
export function saveGame(state: GameState): string | null {
  const raw = JSON.stringify(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    return raw;
  } catch {
    return null;
  }
}
