/**
 * Circuit model for Logic Gate Lab, shared by the client and the score validator.
 *
 * Truth-table rows are the eight (A, B, C) combinations in binary order, with A
 * as the most significant bit: row index 0 is 000 and row 7 is 111.
 */

export const INPUT_NAMES = ['A', 'B', 'C'] as const
export type InputName = (typeof INPUT_NAMES)[number]

export const GATE_OPS = ['AND', 'OR', 'XOR', 'NOT'] as const
export type GateOp = (typeof GATE_OPS)[number]

export const ROW_COUNT = 8
const MAX_EXPRESSION_DEPTH = 12

export interface InputNode {
  kind: 'input'
  name: InputName
}

export interface GateNode {
  kind: 'gate'
  op: GateOp
  /** `null` is an empty slot still waiting for a tile. */
  children: Array<ExprNode | null>
}

export type ExprNode = InputNode | GateNode

export interface DailyPuzzle {
  date: string
  number: number
  /** Target output for rows 000..111. */
  target: boolean[]
}

export const slotCount = (op: GateOp): number => (op === 'NOT' ? 1 : 2)

export const valuesForRow = (row: number): Record<InputName, boolean> => ({
  A: Boolean(row & 4),
  B: Boolean(row & 2),
  C: Boolean(row & 1),
})

export const evaluate = (node: ExprNode, values: Record<InputName, boolean>): boolean => {
  if (node.kind === 'input') return values[node.name]

  const left = node.children[0]
  const right = node.children[1]

  if (node.op === 'NOT') return left ? !evaluate(left, values) : false
  if (!left || !right) return false

  const a = evaluate(left, values)
  const b = evaluate(right, values)

  if (node.op === 'AND') return a && b
  if (node.op === 'OR') return a || b
  return a !== b
}

export const isComplete = (node: ExprNode | null): node is ExprNode => {
  if (!node) return false
  if (node.kind === 'input') return true
  return node.children.every(child => isComplete(child))
}

export const truthTable = (node: ExprNode): boolean[] =>
  Array.from({ length: ROW_COUNT }, (_, row) => evaluate(node, valuesForRow(row)))

export const countGates = (node: ExprNode | null): number => {
  if (!node || node.kind === 'input') return 0
  return 1 + node.children.reduce((sum, child) => sum + countGates(child), 0)
}

export const formatExpression = (node: ExprNode | null): string => {
  if (!node) return '·'
  if (node.kind === 'input') return node.name

  const left = formatExpression(node.children[0] ?? null)

  if (node.op === 'NOT') return `NOT ${left}`

  const right = formatExpression(node.children[1] ?? null)
  return `(${left} ${node.op} ${right})`
}

const isInputName = (value: unknown): value is InputName =>
  typeof value === 'string' && (INPUT_NAMES as readonly string[]).includes(value)

const isGateOp = (value: unknown): value is GateOp =>
  typeof value === 'string' && (GATE_OPS as readonly string[]).includes(value)

const sanitizeExpression = (value: unknown, depth: number): ExprNode | null => {
  if (depth > MAX_EXPRESSION_DEPTH || !value || typeof value !== 'object') return null

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

/**
 * Rebuild an expression from untrusted input (localStorage or an API body),
 * keeping only known node shapes. Unknown data is discarded.
 */
export const parseExpression = (value: unknown): ExprNode | null => sanitizeExpression(value, 0)
