import { formatExpression, parseExpression } from '../../../../utilities/games/logicGate/logic'

const STORAGE_PREFIX = 'ecssgames:logic-gate-lab'

/** Cap what we read back so a corrupted or huge entry cannot slow the editor. */
const MAX_STORED_LENGTH = 1000

interface StoredState {
  text?: unknown
  expr?: unknown
}

/**
 * The editor stores the text the player typed. Saves from the earlier
 * tree-editor version store the circuit instead, so show those back as text
 * rather than losing a player's progress.
 */
export const readStoredCircuit = (date: string): string => {
  if (typeof window === 'undefined') return ''

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${date}`)
    if (!raw) return ''

    const stored = JSON.parse(raw) as StoredState

    if (typeof stored?.text === 'string') {
      return stored.text.slice(0, MAX_STORED_LENGTH)
    }

    const legacy = parseExpression(stored?.expr ?? null)
    return legacy ? formatExpression(legacy) : ''
  } catch {
    return ''
  }
}

export const writeStoredCircuit = (date: string, text: string): void => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${date}`,
      JSON.stringify({ text: text.slice(0, MAX_STORED_LENGTH) }),
    )
  } catch {
    // Storage is optional; the game still works without it.
  }
}
