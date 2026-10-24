import type { Payload } from 'payload'

import type { User } from '../payload-types'

type DisplayNameCollection = 'game-scores' | 'wordle-scores'

const latestDisplayName = async (
  payload: Payload,
  collection: DisplayNameCollection,
  userId: string,
): Promise<string | null> => {
  const result = await payload.find({
    collection,
    where: { user: { equals: userId } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = result.docs[0] as { displayName?: string | null } | undefined
  const name = doc?.displayName?.trim()

  return name || null
}

/**
 * Reuse the player's existing game display name (ECSSle names carry across),
 * falling back to their profile.
 */
export const resolveGameDisplayName = async (payload: Payload, user: User): Promise<string> =>
  (await latestDisplayName(payload, 'game-scores', user.id)) ||
  (await latestDisplayName(payload, 'wordle-scores', user.id)) ||
  (user.name || user.username || 'Anonymous').trim() ||
  'Anonymous'
