import type { Payload } from 'payload'

import { normalizeSotonId } from './sotonId'

/**
 * The capacity ledger for a table is derived from its members' guest-list entries:
 * every member consumes one seat plus however many plus-ones their ticket allows.
 *
 * Deriving it on every write (rather than incrementing/decrementing it) keeps it
 * correct when the guest list is re-imported mid-booking, and means an admin edit
 * through the generic REST API cannot leave it out of sync with `members`.
 */
export const computeMemberCount = async (
  payload: Payload,
  eventId: string,
  members: Array<string | { id: string }> | null | undefined,
): Promise<number> => {
  const memberIds = (Array.isArray(members) ? members : [])
    .map(member => (typeof member === 'string' ? member : member?.id))
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (memberIds.length === 0) return 0

  const users = await payload.find({
    collection: 'users',
    where: { id: { in: memberIds } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const usernames = users.docs
    .map(user => normalizeSotonId(user.username as string | undefined))
    .filter(Boolean)

  let holderDocs: Array<{ sotonId?: string | null; plusOneCount?: number | null }> = []
  if (usernames.length > 0) {
    const holders = await payload.find({
      collection: 'ticket-holders',
      where: {
        and: [{ event: { equals: eventId } }, { sotonId: { in: usernames } }],
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    holderDocs = holders.docs
  }

  const plusOnesBySotonId = new Map<string, number>()
  for (const holder of holderDocs) {
    const key = normalizeSotonId(holder.sotonId)
    if (!key) continue
    const count = typeof holder.plusOneCount === 'number' ? holder.plusOneCount : 0
    // Defensive: duplicate guest-list rows can't be counted twice.
    plusOnesBySotonId.set(key, Math.max(plusOnesBySotonId.get(key) ?? 0, Math.max(0, count)))
  }

  let total = 0
  for (const user of users.docs) {
    total += 1 + (plusOnesBySotonId.get(normalizeSotonId(user.username as string)) ?? 0)
  }

  // Members whose user record has since been deleted still occupy a seat.
  total += Math.max(0, memberIds.length - users.docs.length)

  return total
}
