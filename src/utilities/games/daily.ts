/**
 * Shared helpers for dated (daily) games.
 *
 * The day key is UTC so every game rolls over at the same moment. Values are
 * intentionally derived only from the date, never from user data.
 */

export const getDayKey = (now: Date = new Date()): string => now.toISOString().split('T')[0]

export const getPuzzleNumber = (now: Date = new Date()): number => {
  const epoch = new Date('2026-01-01')
  const diff = Math.floor((now.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

/** FNV-1a: small, deterministic string hash used to seed daily puzzles. */
export const hashString = (value: string): number => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/** mulberry32: returns a deterministic pseudo-random generator in [0, 1). */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
