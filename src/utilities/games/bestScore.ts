/**
 * Per-game personal bests stored in localStorage.
 *
 * These games have no accounts or leaderboards, so scores are local only. Every
 * access is guarded: storage can be unavailable (private mode, disabled cookies,
 * quota) and a missing best score must never break a game.
 */

const KEY_PREFIX = 'ecssgames'

const storageKey = (game: string): string => `${KEY_PREFIX}:${game}:best`

export const readBestScore = <T>(game: string): T | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(storageKey(game))
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const writeBestScore = <T>(game: string, value: T): void => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(storageKey(game), JSON.stringify(value))
  } catch {
    // Storage is optional; ignore failures so the game keeps working.
  }
}
