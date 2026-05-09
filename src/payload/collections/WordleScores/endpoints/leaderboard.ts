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
}

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

      const reversed = [...sorted].reverse()
      for (const score of reversed) {
        if (score.solved) {
          currentStreak++
        } else {
          break
        }
      }

      for (const score of sorted) {
        if (score.solved) {
          streak++
          if (streak > maxStreak) maxStreak = streak
        } else {
          streak = 0
        }
      }

      const latestScore = reversed[0]
      const displayName = latestScore?.displayName || 'Anonymous'

      stats.push({
        userId,
        displayName,
        totalGames,
        totalWins,
        winRate: Math.round(winRate * 100),
        currentStreak,
        maxStreak,
        avgGuesses: Math.round(avgGuesses * 100) / 100,
      })
    })

    stats.sort((a, b) => {
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins
      return b.winRate - a.winRate
    })

    res.json({ leaderboard: stats })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}
