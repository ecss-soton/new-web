import { addDays, getDayKey, isNextDay } from './daily'

/**
 * Shared game leaderboard model.
 *
 * Every leaderboard (ECSSle and any game using the generic `game-scores`
 * collection) is computed from the same shape: one record per user per completed
 * game. Adding a game means adding a config here so its table labels and rating
 * formula live next to the rest of the game metadata.
 */

export interface ScoreRecord {
  userId: string
  displayName: string
  /** Europe/London day key for daily games. */
  date: string
  solved: boolean
  /** The game's score for this completion; only solved records count towards the average. */
  value: number | null
}

export interface LeaderboardStats {
  games: number
  wins: number
  winRate: number
  currentStreak: number
  maxStreak: number
  average: number
}

export interface LeaderboardRow {
  userId: string
  displayName: string
  rating: number
  games: number
  wins: number
  /** Whole percent, as shown in the table. */
  winRate: number
  currentStreak: number
  maxStreak: number
  average: number
}

export interface LeaderboardLabels {
  wins: string
  average: string
  showAccuracy: boolean
}

export interface GameLeaderboardConfig {
  slug: string
  title: string
  leaderboardPath: string
  labels: LeaderboardLabels
  computeRating: (stats: LeaderboardStats) => number
}

const wordleRating = (stats: LeaderboardStats): number =>
  stats.winRate * 500 +
  Math.log(stats.wins + 1) * 50 +
  stats.currentStreak * 5 +
  stats.maxStreak * 2 -
  stats.average * 30

/**
 * Every Logic Gate Lab target is solvable with three gates, so three is par.
 * The ECSSle penalty (average * 30) is tuned for ~4-5 guesses and far outweighs
 * the per-solve credit here, which made a normal 3-gate first solve come out
 * negative (20 + 35 + 7 - 90). Only gates above par are penalised, and the
 * result is floored at 0 so a weak first solve never shows a negative rating.
 */
const LOGIC_GATE_PAR_GATES = 3

const logicGateRating = (stats: LeaderboardStats): number =>
  Math.max(
    0,
    stats.wins * 20 +
      Math.log(stats.wins + 1) * 50 +
      stats.currentStreak * 5 +
      stats.maxStreak * 2 -
      Math.max(0, stats.average - LOGIC_GATE_PAR_GATES) * 20,
  )

export const GAME_LEADERBOARD_CONFIGS: Record<string, GameLeaderboardConfig> = {
  wordle: {
    slug: 'wordle',
    title: 'ECSSle',
    leaderboardPath: '/games/wordle/leaderboard',
    labels: { wins: 'Wins', average: 'Avg guesses', showAccuracy: true },
    computeRating: wordleRating,
  },
  'logic-gate-lab': {
    slug: 'logic-gate-lab',
    title: 'Logic Gate Lab',
    leaderboardPath: '/games/logic-gate-lab/leaderboard',
    labels: { wins: 'Solves', average: 'Avg gates', showAccuracy: false },
    computeRating: logicGateRating,
  },
}

export const LEADERBOARD_GAME_IDS = Object.keys(GAME_LEADERBOARD_CONFIGS)

const sortByDate = (records: ScoreRecord[]): ScoreRecord[] =>
  [...records].sort((a, b) => {
    if (a.date < b.date) return -1
    if (a.date > b.date) return 1
    return 0
  })

const computeCurrentStreak = (sorted: ScoreRecord[], today: string): number => {
  const latest = sorted[sorted.length - 1]
  if (!latest) return 0

  // The streak survives a day that has not been played yet, but not a missed day.
  let expected: string
  if (latest.date === today) expected = today
  else if (isNextDay(latest.date, today)) expected = latest.date
  else return 0

  let streak = 0
  for (let index = sorted.length - 1; index >= 0; index--) {
    const record = sorted[index]
    if (record.date !== expected || !record.solved) break
    streak += 1
    expected = addDays(expected, -1)
  }

  return streak
}

const computeMaxStreak = (sorted: ScoreRecord[]): number => {
  let maxStreak = 0
  let streak = 0
  let previousDate = ''

  for (const record of sorted) {
    if (record.solved) {
      streak = previousDate && isNextDay(previousDate, record.date) ? streak + 1 : 1
      if (streak > maxStreak) maxStreak = streak
    } else {
      streak = 0
    }
    previousDate = record.date
  }

  return maxStreak
}

export const computeLeaderboard = (
  records: ScoreRecord[],
  config: GameLeaderboardConfig,
  today: string = getDayKey(),
): LeaderboardRow[] => {
  const byUser = new Map<string, ScoreRecord[]>()

  for (const record of records) {
    if (!record.userId || !record.date) continue
    const existing = byUser.get(record.userId)
    if (existing) existing.push(record)
    else byUser.set(record.userId, [record])
  }

  const rows: LeaderboardRow[] = []

  byUser.forEach((userRecords, userId) => {
    const sorted = sortByDate(userRecords)
    const games = sorted.length
    const wins = sorted.filter(record => record.solved).length
    const winRate = games > 0 ? wins / games : 0

    const solvedValues = sorted
      .filter(record => record.solved && typeof record.value === 'number')
      .map(record => record.value as number)
    const average =
      solvedValues.length > 0
        ? solvedValues.reduce((sum, value) => sum + value, 0) / solvedValues.length
        : 0

    const stats: LeaderboardStats = {
      games,
      wins,
      winRate,
      currentStreak: computeCurrentStreak(sorted, today),
      maxStreak: computeMaxStreak(sorted),
      average,
    }

    rows.push({
      userId,
      displayName: sorted[sorted.length - 1]?.displayName || 'Anonymous',
      rating: Math.round(config.computeRating(stats)),
      games,
      wins,
      winRate: Math.round(winRate * 100),
      currentStreak: stats.currentStreak,
      maxStreak: stats.maxStreak,
      average,
    })
  })

  return rows.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.average - b.average
  })
}
