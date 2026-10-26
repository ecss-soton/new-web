export interface NominationLike {
  id?: string | null
  nickname?: string | null
  populatedNominees?: Array<{ name?: string | null }> | null
}

/**
 * Display label for a nomination/ticket. Shared by the public result views and
 * the admin live-standings calculation so the two cannot drift apart.
 *
 * `null` is RON, and a string is an unpopulated relationship (e.g. if the
 * nomination was deleted).
 */
export const nominationDisplayName = (nomination: NominationLike | string | null): string => {
  if (!nomination) return 'Re-Open Nominations'
  if (typeof nomination === 'string') return 'Unknown'

  const names = (nomination.populatedNominees ?? [])
    .map(nominee => nominee.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .join(' & ')
  const nickname = nomination.nickname?.trim()

  if (nickname && names) return `${nickname} - ${names}`
  if (names) return names
  if (nickname) return nickname
  return 'Unknown'
}

/**
 * Short label for the elected summary: just the nickname when one exists.
 * The detailed result chart keeps the full nickname + nominee names.
 */
export const nominationShortName = (nomination: NominationLike | string | null): string => {
  if (!nomination) return 'Re-Open Nominations'
  if (typeof nomination === 'string') return 'Unknown'

  const nickname = nomination.nickname?.trim()
  if (nickname) return nickname

  return nominationDisplayName(nomination)
}
