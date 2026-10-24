import type { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'

import { GAME_SCORE_VALIDATORS } from '../../../../utilities/games/scoring'
import type { User } from '../../../payload-types'
import { resolveGameDisplayName } from '../../../utilities/gameScores'

interface ExistingScore {
  id: string
  score?: number | null
}

const findEntry = async (
  payload: Payload,
  entryKey: string,
): Promise<ExistingScore | undefined> => {
  const result = await payload.find({
    collection: 'game-scores',
    where: { entryKey: { equals: entryKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.docs[0] as unknown as ExistingScore | undefined
}

export const submit: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = (req.body ?? {}) as { game?: unknown; data?: unknown }
  const game = typeof body.game === 'string' ? body.game : ''
  const validator = GAME_SCORE_VALIDATORS[game]

  if (!validator) {
    res.status(400).json({ error: 'Unknown game' })
    return
  }

  const validation = validator({ data: body.data, now: new Date() })
  if ('error' in validation) {
    res.status(400).json({ error: validation.error })
    return
  }

  const { result } = validation
  const entryKey = `${game}:${user.id}:${result.date}`
  const scoreData = {
    score: result.score,
    metrics: result.metrics ?? null,
    solved: true,
    completed: true,
  }

  try {
    const existing = await findEntry(payload, entryKey)

    if (existing) {
      const best = typeof existing.score === 'number' ? existing.score : result.score

      if (result.score < best) {
        await payload.update({
          collection: 'game-scores',
          id: existing.id,
          data: scoreData,
          overrideAccess: true,
        })
        res.json({ recorded: true, improved: true, score: result.score, best: result.score })
        return
      }

      res.json({ recorded: true, improved: false, score: result.score, best })
      return
    }

    const displayName = await resolveGameDisplayName(payload, user as User)

    await payload.create({
      collection: 'game-scores',
      data: {
        game,
        entryKey,
        user: user.id,
        displayName,
        date: result.date,
        ...scoreData,
      },
      overrideAccess: true,
    })

    res.json({ recorded: true, improved: false, score: result.score, best: result.score })
  } catch (err: unknown) {
    // A concurrent first submission can hit the unique entryKey index.
    const message = err instanceof Error ? err.message : ''

    if (/duplicate key|E11000/i.test(message)) {
      const existing = await findEntry(payload, entryKey).catch(() => undefined)

      if (existing) {
        const best = typeof existing.score === 'number' ? existing.score : result.score

        if (result.score < best) {
          await payload.update({
            collection: 'game-scores',
            id: existing.id,
            data: scoreData,
            overrideAccess: true,
          })
          res.json({ recorded: true, improved: true, score: result.score, best: result.score })
          return
        }

        res.json({ recorded: true, improved: false, score: result.score, best })
        return
      }
    }

    payload.logger.error(message || 'Unknown error')
    res.status(500).json({ error: 'Failed to record score' })
  }
}
