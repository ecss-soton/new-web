import type { PayloadHandler } from 'payload/config'

interface UserStats {
  userId: string
  displayName: string
  totalGames: number
  totalWins: number
  winRate: number
  currentStreak: number
  maxStreak: number
  avgGuesses: number
  rating: number
}

const isNextDay = (prev: string, next: string): boolean => {
  const p = new Date(prev)
  const n = new Date(next)
  const day = 1000 * 60 * 60 * 24
  return Math.round((n.getTime() - p.getTime()) / day) === 1
}

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

const toYYYYMMDD = (iso: string): string => iso.split('T')[0]

export const leaderboard: PayloadHandler = async (req, res): Promise<void> => {
  const { payload } = req

  try {
    const scores = await payload.find({
      collection: 'wordle-scores',
      limit: 0,
    })

    const allScores = scores.docs

    const userMap = new Map<string, any[]>()
    allScores.forEach((score: any) => {
      const uid = typeof score.user === 'object' ? score.user.id || score.user : score.user
      if (!userMap.has(uid)) userMap.set(uid, [])
      const userScores = userMap.get(uid)
      if (userScores) userScores.push(score)
    })

    const stats: UserStats[] = []

    userMap.forEach((userScores, userId) => {
      const sorted = userScores.sort((a: any, b: any) => {
        if (a.date < b.date) return -1
        if (a.date > b.date) return 1
        return 0
      })

      const totalGames = sorted.length
      const totalWins = sorted.filter((s: any) => s.solved).length
      const winRate = totalGames > 0 ? totalWins / totalGames : 0
      const solvedScores = sorted.filter((s: any) => s.solved)
      const avgGuesses =
        solvedScores.length > 0
          ? solvedScores.reduce((sum: number, s: any) => sum + s.guesses, 0) / solvedScores.length
          : 0

      let currentStreak = 0
      let maxStreak = 0
      let streak = 0
      let prevDate = ''

      const reversed = [...sorted].reverse()
      const today = toYYYYMMDD(new Date().toISOString())
      let expectedDate = today

      for (const score of reversed) {
        const scoreDate = typeof score.date === 'string' ? score.date : toYYYYMMDD(score.date)
        if (score.solved && (expectedDate === today || scoreDate === expectedDate)) {
          currentStreak++
          const next = new Date(scoreDate)
          next.setDate(next.getDate() - 1)
          expectedDate = toYYYYMMDD(next.toISOString())
        } else {
          break
        }
      }

      for (const score of sorted) {
        const scoreDate = typeof score.date === 'string' ? score.date : toYYYYMMDD(score.date)
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
      const displayName = latestScore?.displayName || 'Anonymous'

      const rating = computeRating(winRate, totalWins, currentStreak, maxStreak, avgGuesses)

      stats.push({
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
    })

    stats.sort((a, b) => b.rating - a.rating)

    res.json({ leaderboard: stats })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}
