import type { PayloadHandler } from 'payload/config'

import { toDayKey } from '../../../../utilities/games/daily'
import {
  computeLeaderboard,
  GAME_LEADERBOARD_CONFIGS,
  type ScoreRecord,
} from '../../../../utilities/games/leaderboard'
import { getHiddenUserIds } from '../../../utilities/gameVisibility'

interface WordleScoreDoc {
  user: string | { id: string }
  displayName?: string | null
  date?: string | null
  solved?: boolean | null
  guesses?: number | null
}

const toRecord = (doc: WordleScoreDoc): ScoreRecord | null => {
  const userId = typeof doc.user === 'object' ? doc.user.id : doc.user
  if (!userId || !doc.date) return null

  return {
    userId,
    displayName: (doc.displayName || 'Anonymous').trim() || 'Anonymous',
    date: toDayKey(doc.date),
    solved: Boolean(doc.solved),
    value: typeof doc.guesses === 'number' ? doc.guesses : null,
  }
}

export const leaderboard: PayloadHandler = async (req, res): Promise<void> => {
  const { payload } = req

  try {
    const scores = await payload.find({
      collection: 'wordle-scores',
      where: { completed: { equals: true } },
      limit: 0,
      depth: 0,
    })

    const hidden = await getHiddenUserIds(payload, 'wordle')
    const records: ScoreRecord[] = []

    for (const doc of scores.docs as unknown as WordleScoreDoc[]) {
      const record = toRecord(doc)
      if (record && !hidden.has(record.userId)) records.push(record)
    }

    res.json({
      leaderboard: computeLeaderboard(records, GAME_LEADERBOARD_CONFIGS.wordle),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}
