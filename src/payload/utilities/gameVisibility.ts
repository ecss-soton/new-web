import type { Payload } from 'payload'

interface PreferenceDoc {
  user: string | { id: string }
}

/**
 * Users who opted out of a game's leaderboard. Their scores stay recorded; the
 * leaderboard endpoints simply omit their rows.
 */
export const getHiddenUserIds = async (payload: Payload, game: string): Promise<Set<string>> => {
  const prefs = await payload.find({
    collection: 'game-prefs',
    where: { and: [{ game: { equals: game } }, { hidden: { equals: true } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const userIds: string[] = []

  for (const pref of prefs.docs as unknown as PreferenceDoc[]) {
    userIds.push(typeof pref.user === 'object' ? pref.user.id : pref.user)
  }

  return new Set(userIds)
}
