import {
  type ExprNode,
  GATE_OPS,
  type GateOp,
  INPUT_NAMES,
  type InputName,
  slotCount,
} from './logic'

const STORAGE_PREFIX = 'ecssgames:logic-gate-lab'
const MAX_DEPTH = 12

const isInputName = (value: unknown): value is InputName =>
  typeof value === 'string' && (INPUT_NAMES as readonly string[]).includes(value)

const isGateOp = (value: unknown): value is GateOp =>
  typeof value === 'string' && (GATE_OPS as readonly string[]).includes(value)

/**
 * localStorage is player-editable, so stored circuits are rebuilt from known
 * node shapes only. Unknown data is discarded instead of rendered.
 */
const sanitizeExpression = (value: unknown, depth: number): ExprNode | null => {
  if (depth > MAX_DEPTH || !value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>

  if (record.kind === 'input' && isInputName(record.name)) {
    return { kind: 'input', name: record.name }
  }

  if (record.kind === 'gate' && isGateOp(record.op)) {
    const children = Array.isArray(record.children) ? record.children : []
    const sanitizedChildren: Array<ExprNode | null> = []

    for (let index = 0; index < slotCount(record.op); index++) {
      sanitizedChildren.push(sanitizeExpression(children[index], depth + 1))
    }

    return {
      kind: 'gate',
      op: record.op,
      children: sanitizedChildren,
    }
  }

  return null
}

interface StoredState {
  expr?: unknown
}

export const readStoredExpression = (date: string): ExprNode | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${date}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredState
    return sanitizeExpression(parsed?.expr ?? null, 0)
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
