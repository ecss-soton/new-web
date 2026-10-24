import type { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'

import { LEADERBOARD_GAME_IDS } from '../../../../utilities/games/leaderboard'

interface ExistingPreference {
  id: string
  hidden?: boolean | null
}

const gameFrom = (value: unknown): string =>
  typeof value === 'string' && LEADERBOARD_GAME_IDS.includes(value) ? value : ''

const preferenceKey = (userId: string, game: string): string => `${userId}:${game}`

const findPreference = async (
  payload: Payload,
  entryKey: string,
): Promise<ExistingPreference | undefined> => {
  const result = await payload.find({
    collection: 'game-prefs',
    where: { entryKey: { equals: entryKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.docs[0] as unknown as ExistingPreference | undefined
}

export const getPreference: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const game = gameFrom(req.query?.game)
  if (!game) {
    res.status(400).json({ error: 'Unknown game' })
    return
  }

  try {
    const existing = await findPreference(payload, preferenceKey(user.id, game))
    res.json({ game, hidden: Boolean(existing?.hidden) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to load leaderboard preference' })
  }
}

export const setPreference: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = (req.body ?? {}) as { game?: unknown; hidden?: unknown }
  const game = gameFrom(body.game)

  if (!game || typeof body.hidden !== 'boolean') {
    res.status(400).json({ error: 'Invalid preference' })
    return
  }

  const entryKey = preferenceKey(user.id, game)

  try {
    const existing = await findPreference(payload, entryKey)

    if (existing) {
      await payload.update({
        collection: 'game-prefs',
        id: existing.id,
        data: { hidden: body.hidden },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'game-prefs',
        data: {
          entryKey,
          user: user.id,
          game,
          hidden: body.hidden,
        },
        overrideAccess: true,
      })
    }

    res.json({ game, hidden: body.hidden })
  } catch (err: unknown) {
    // Concurrent first save can hit the unique entryKey index.
    const message = err instanceof Error ? err.message : ''

    if (/duplicate key|E11000/i.test(message)) {
      const existing = await findPreference(payload, entryKey).catch(() => undefined)

      if (existing) {
        await payload.update({
          collection: 'game-prefs',
          id: existing.id,
          data: { hidden: body.hidden },
          overrideAccess: true,
        })
        res.json({ game, hidden: body.hidden })
        return
      }
    }

    payload.logger.error(message || 'Unknown error')
    res.status(500).json({ error: 'Failed to save leaderboard preference' })
  }
}
