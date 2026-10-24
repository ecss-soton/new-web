import type { PayloadHandler } from 'payload/config'

import { toDayKey } from '../../../../utilities/games/daily'
import {
  computeLeaderboard,
  GAME_LEADERBOARD_CONFIGS,
  type ScoreRecord,
} from '../../../../utilities/games/leaderboard'

interface WordleScoreDoc {
  displayName?: string | null
  date?: string | null
  solved?: boolean | null
  guesses?: number | null
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
      depth: 0,
    })

    const docs = scores.docs as unknown as WordleScoreDoc[]
    const records: ScoreRecord[] = []

    for (const doc of docs) {
      if (doc.date) {
        records.push({
          userId,
          displayName: doc.displayName || 'Anonymous',
          date: toDayKey(doc.date),
          solved: Boolean(doc.solved),
          value: typeof doc.guesses === 'number' ? doc.guesses : null,
        })
      }
    }

    const row = computeLeaderboard(records, GAME_LEADERBOARD_CONFIGS.wordle)[0]
    const latest = docs[docs.length - 1]

    res.json({
      userId,
      displayName: latest?.displayName || '',
      totalGames: row?.games ?? 0,
      totalWins: row?.wins ?? 0,
      winRate: row?.winRate ?? 0,
      currentStreak: row?.currentStreak ?? 0,
      maxStreak: row?.maxStreak ?? 0,
      avgGuesses: row ? Math.round(row.average * 100) / 100 : 0,
      rating: row?.rating ?? 0,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get stats' })
  }
}
