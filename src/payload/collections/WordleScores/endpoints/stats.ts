import type { PayloadHandler } from 'payload/config'

import { addDays, getDayKey, isNextDay, toDayKey } from '../../../../utilities/games/daily'
import type { WordleScore } from '../../../payload-types'

const computeRating = (
  winRate: number,
  totalWins: number,
  currentStreak: number,
  maxStreak: number,
  avgGuesses: number,
): number => {
  return (
    winRate * 500 +
    Math.log(totalWins + 1) * 50 +
    currentStreak * 5 +
    maxStreak * 2 -
    avgGuesses * 30
  )
}

export const stats: PayloadHandler = async (req, res): Promise<void> => {
  const { payload } = req

  try {
    const { userId } = req.params

    const scores = await payload.find({
      collection: 'wordle-scores',
      where: { and: [{ user: { equals: userId } }, { completed: { equals: true } }] },
      sort: 'date',
      limit: 0,
    })

    const allScores = scores.docs as WordleScore[]
    const totalGames = allScores.length
    const totalWins = allScores.filter(s => s.solved).length
    const winRate = totalGames > 0 ? totalWins / totalGames : 0
    const solvedScores = allScores.filter(s => s.solved)
    const avgGuesses =
      solvedScores.length > 0
        ? solvedScores.reduce((sum, s) => sum + s.guesses, 0) / solvedScores.length
        : 0

    let currentStreak = 0
    let maxStreak = 0
    let streak = 0
    let prevDate = ''

    const reversed = [...allScores].reverse()
    const today = getDayKey()
    let expectedDate = today

    for (const score of reversed) {
      const scoreDate = toDayKey(score.date)
      if (score.solved && (expectedDate === today || scoreDate === expectedDate)) {
        currentStreak++
        expectedDate = addDays(scoreDate, -1)
      } else {
        break
      }
    }

    for (const score of allScores) {
      const scoreDate = toDayKey(score.date)
      if (score.solved) {
        if (!prevDate || isNextDay(prevDate, scoreDate)) {
          streak++
        } else {
          streak = 1
        }
        if (streak > maxStreak) maxStreak = streak
      } else {
        streak = 0
      }
      prevDate = scoreDate
    }

    const latestScore = reversed[0]
    const displayName = latestScore?.displayName || ''

    const rating = computeRating(winRate, totalWins, currentStreak, maxStreak, avgGuesses)

    res.json({
      userId,
      displayName,
      totalGames,
      totalWins,
      winRate: Math.round(winRate * 100),
      currentStreak,
      maxStreak,
      avgGuesses: Math.round(avgGuesses * 100) / 100,
      rating: Math.round(rating),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get stats' })
  }
}
