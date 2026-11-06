import type { Payload } from 'payload'

import type { BookingEvent, TicketHolder, User } from '../../../payload-types'
import { displayNameWithoutUsername } from '../../../utilities/memberCsv'
import { normalizeSotonId } from '../../../utilities/sotonId'

/** Mongo `$in` with thousands of values is slow to plan; keep the batches small. */
const USERNAME_CHUNK = 500

/** Query-string / body values arrive as `unknown`; only strings are useful here. */
export const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

export const loadEvent = async (
  payload: Payload,
  eventId: string,
): Promise<BookingEvent | null> => {
  try {
    return (await payload.findByID({
      collection: 'booking-events',
      id: eventId,
      depth: 0,
    })) as BookingEvent
  } catch {
    return null
  }
}

/**
 * One read of the event's guest list, keyed by the normalised sotonId. Both
 * import paths use it so a paste never becomes a query per row.
 */
export const loadHoldersBySotonId = async (
  payload: Payload,
  eventId: string,
): Promise<Map<string, TicketHolder>> => {
  const holders = await payload.find({
    collection: 'ticket-holders',
    where: { event: { equals: eventId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const bySotonId = new Map<string, TicketHolder>()
  for (const holder of holders.docs as TicketHolder[]) {
    const key = normalizeSotonId(holder.sotonId)
    if (!key || bySotonId.has(key)) continue
    bySotonId.set(key, holder)
  }
  return bySotonId
}

/**
 * Resolves the accounts behind a list of sotonIds in batches, so a sotonId-only
 * paste can fill in display names. Usernames are matched case-insensitively by
 * querying both the normalised and upper-cased forms and keying on the normalised
 * value.
 */
export const loadUsersBySotonId = async (
  payload: Payload,
  sotonIds: string[],
): Promise<Map<string, User>> => {
  const bySotonId = new Map<string, User>()
  const unique = [...new Set(sotonIds.map(normalizeSotonId).filter(Boolean))]
  if (unique.length === 0) return bySotonId

  for (let start = 0; start < unique.length; start += USERNAME_CHUNK) {
    const chunk = unique.slice(start, start + USERNAME_CHUNK)
    const candidates = [...new Set([...chunk, ...chunk.map(value => value.toUpperCase())])]

    const users = await payload.find({
      collection: 'users',
      where: { username: { in: candidates } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    for (const user of users.docs as User[]) {
      const key = normalizeSotonId(user.username)
      if (key && !bySotonId.has(key)) bySotonId.set(key, user)
    }
  }

  return bySotonId
}

/** Azure AD display names carry a `(<username>)` suffix; strip it for guest names. */
export const accountDisplayName = (user?: User): string =>
  user ? displayNameWithoutUsername(user.name as string, user.username as string) : ''
