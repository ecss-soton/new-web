import type { PayloadHandler } from 'payload/config'

export const stats: PayloadHandler = async (req, res): Promise<void> => {
  const { payload } = req

  try {
    const { userId } = req.params

    const scores = await payload.find({
      collection: 'wordle-scores',
      where: { user: { equals: userId } },
      sort: 'date',
      limit: 0,
    })

    const allScores = scores.docs
    const totalGames = allScores.length
    const totalWins = allScores.filter((s: any) => s.solved).length
    const winRate = totalGames > 0 ? totalWins / totalGames : 0
    const solvedScores = allScores.filter((s: any) => s.solved)
    const avgGuesses =
      solvedScores.length > 0
        ? solvedScores.reduce((sum: number, s: any) => sum + s.guesses, 0) / solvedScores.length
        : 0

    let currentStreak = 0
    let maxStreak = 0
    let streak = 0

    const reversed = [...allScores].reverse()
    for (const score of reversed) {
      if ((score as any).solved) {
        currentStreak++
      } else {
        break
      }
    }

    for (const score of allScores) {
      if ((score as any).solved) {
        streak++
        if (streak > maxStreak) maxStreak = streak
      } else {
        streak = 0
      }
    }

    const latestScore = reversed[0] as any
    const displayName = latestScore?.displayName || ''

    res.json({
      userId,
      displayName,
      totalGames,
      totalWins,
      winRate: Math.round(winRate * 100),
      currentStreak,
      maxStreak,
      avgGuesses: Math.round(avgGuesses * 100) / 100,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get stats' })
  }
}
