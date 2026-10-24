import type { PayloadHandler } from 'payload/config'

import {
  computeLeaderboard,
  GAME_LEADERBOARD_CONFIGS,
  type ScoreRecord,
} from '../../../../utilities/games/leaderboard'
import { getHiddenUserIds } from '../../../utilities/gameVisibility'

interface ScoreDoc {
  user: string | { id: string }
  displayName?: string | null
  date?: string | null
  solved?: boolean | null
  score?: number | null
}

export const leaderboard: PayloadHandler = async (req, res): Promise<void> => {
  const { payload } = req
  const game = typeof req.query?.game === 'string' ? req.query.game : ''
  const config = GAME_LEADERBOARD_CONFIGS[game]

  if (!config) {
    res.status(400).json({ error: 'Unknown game' })
    return
  }

  try {
    const scores = await payload.find({
      collection: 'game-scores',
      where: { and: [{ game: { equals: game } }, { completed: { equals: true } }] },
      limit: 0,
      depth: 0,
    })

    const hidden = await getHiddenUserIds(payload, game)
    const records: ScoreRecord[] = []

    for (const doc of scores.docs as unknown as ScoreDoc[]) {
      const userId = typeof doc.user === 'object' ? doc.user.id : doc.user
      if (!userId || hidden.has(userId) || !doc.date) continue

      records.push({
        userId,
        displayName: (doc.displayName || 'Anonymous').trim() || 'Anonymous',
        date: doc.date,
        solved: Boolean(doc.solved),
        value: typeof doc.score === 'number' ? doc.score : null,
      })
    }

    res.json({ game, leaderboard: computeLeaderboard(records, config) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}
