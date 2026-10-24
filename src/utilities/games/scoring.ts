import { countGates, isComplete, parseExpression, truthTable } from './logicGate/logic'
import { createDailyPuzzle } from './logicGate/puzzle'

/**
 * Server-side score validation for games stored in the generic `game-scores`
 * collection.
 *
 * Never trust a client score: a validator must rebuild and verify the game
 * result against server-owned state, then return the score to record. Add a new
 * entry to `GAME_SCORE_VALIDATORS` when adding a scored game.
 */

export interface GameScoreResult {
  /** Europe/London day key the result belongs to. */
  date: string
  /** Game-defined score; see the matching entry in `leaderboard.ts`. */
  score: number
  metrics?: Record<string, unknown>
}

export type GameScoreValidation =
  | { valid: true; result: GameScoreResult }
  | { valid: false; error: string }

export type GameScoreValidator = (args: { data: unknown; now: Date }) => GameScoreValidation

const validateLogicGateLab: GameScoreValidator = ({ data, now }) => {
  const submission = data && typeof data === 'object' ? (data as { expression?: unknown }) : {}
  const expression = parseExpression(submission.expression)

  if (!expression || !isComplete(expression)) {
    return { valid: false, error: 'Circuit is incomplete' }
  }

  const puzzle = createDailyPuzzle(now)
  const table = truthTable(expression)

  if (table.some((value, row) => value !== puzzle.target[row])) {
    return { valid: false, error: 'Circuit does not match today’s target' }
  }

  const gates = countGates(expression)
  if (gates < 1 || gates > 32) {
    return { valid: false, error: 'Circuit size is out of range' }
  }

  return {
    valid: true,
    result: { date: puzzle.date, score: gates, metrics: { gates } },
  }
}

export const GAME_SCORE_VALIDATORS: Record<string, GameScoreValidator> = {
  'logic-gate-lab': validateLogicGateLab,
}

export const isScoredGame = (game: string): boolean =>
  Object.prototype.hasOwnProperty.call(GAME_SCORE_VALIDATORS, game)
