import {
  createSeededRandom,
  getDayKey,
  getPuzzleNumberForDay,
  hashString,
} from '../../../../utilities/games/daily'
import { type DailyPuzzle, INPUT_NAMES, ROW_COUNT, truthTable } from './logic'

/**
 * Every three-input Boolean function can be built with at most three of the
 * game's gates (single gates and constants excluded), so the daily target is
 * chosen from that set directly. That gives many more distinct puzzles than
 * generating circuits, and guarantees a short solution always exists.
 */

const ROW_MASK = (1 << ROW_COUNT) - 1
const BINARY_OPS = ['AND', 'OR', 'XOR'] as const

const maskOf = (table: boolean[]): number =>
  table.reduce((mask, value, row) => (value ? mask | (1 << row) : mask), 0)

const buildCandidateMasks = (): number[] => {
  const literalMasks = INPUT_NAMES.map(name => maskOf(truthTable({ kind: 'input', name })))

  const singleGateMasks: number[] = []

  for (let left = 0; left < INPUT_NAMES.length; left++) {
    for (let right = left + 1; right < INPUT_NAMES.length; right++) {
      for (const op of BINARY_OPS) {
        const table = truthTable({
          kind: 'gate',
          op,
          children: [
            { kind: 'input', name: INPUT_NAMES[left] },
            { kind: 'input', name: INPUT_NAMES[right] },
          ],
        })
        singleGateMasks.push(maskOf(table))
      }
    }
  }

  // Constants, single inputs and their negation, and any function reachable with
  // one gate are all too easy to be a daily puzzle.
  const excluded = new Set<number>([
    0,
    ROW_MASK,
    ...literalMasks,
    ...literalMasks.map(mask => mask ^ ROW_MASK),
    ...singleGateMasks,
  ])

  const candidates: number[] = []
  for (let mask = 0; mask <= ROW_MASK; mask++) {
    if (!excluded.has(mask)) candidates.push(mask)
  }

  return candidates
}

const shuffleMasks = (masks: number[]): number[] => {
  const random = createSeededRandom(hashString('logic-gate-lab:candidates'))
  const shuffled = [...masks]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
  }

  return shuffled
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

// Walk the candidate list with a stride that is coprime to its length, so the
// same target cannot come back for a full cycle of days.
const pickStride = (length: number): number => {
  let stride = 97
  while (gcd(stride, length) !== 1) stride += 1
  return stride
}

const CANDIDATES = shuffleMasks(buildCandidateMasks())
const STRIDE = pickStride(CANDIDATES.length)
const OFFSET = 41

export const createDailyPuzzle = (now: Date = new Date()): DailyPuzzle => {
  const date = getDayKey(now)
  const number = getPuzzleNumberForDay(date)
  const index =
    (((number * STRIDE + OFFSET) % CANDIDATES.length) + CANDIDATES.length) % CANDIDATES.length
  const mask = CANDIDATES[index]

  return {
    date,
    number,
    target: Array.from({ length: ROW_COUNT }, (_, row) => Boolean(mask & (1 << row))),
  }
}
