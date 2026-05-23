import type { PayloadHandler } from 'payload/config'

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
    let prevDate = ''

    const reversed = [...allScores].reverse()
    const today = toYYYYMMDD(new Date().toISOString())
    let expectedDate = today

    for (const score of reversed) {
      const scoreDate =
        typeof (score as any).date === 'string'
          ? (score as any).date
          : toYYYYMMDD((score as any).date)
      if ((score as any).solved && (expectedDate === today || scoreDate === expectedDate)) {
        currentStreak++
        const next = new Date(scoreDate)
        next.setDate(next.getDate() - 1)
        expectedDate = toYYYYMMDD(next.toISOString())
      } else {
        break
      }
    }

    for (const score of allScores) {
      const scoreDate =
        typeof (score as any).date === 'string'
          ? (score as any).date
          : toYYYYMMDD((score as any).date)
      if ((score as any).solved) {
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

    const latestScore = reversed[0] as any
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
