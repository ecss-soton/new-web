import { type ExprNode, parseExpression } from '../../../../utilities/games/logicGate/logic'

const STORAGE_PREFIX = 'ecssgames:logic-gate-lab'

interface StoredState {
  expr?: unknown
}

export const readStoredExpression = (date: string): ExprNode | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${date}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredState
    return parseExpression(parsed?.expr ?? null)
  } catch {
    return null
  }
}

export const writeStoredExpression = (date: string, expression: ExprNode | null): void => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${date}`, JSON.stringify({ expr: expression }))
  } catch {
    // Storage is optional; the game still works without it.
  }
}
