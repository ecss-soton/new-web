import type { Payload } from 'payload'

import { relationshipIds } from './relationships'
import { normalizeSotonId } from './sotonId'

/** Mirrors the `plusOneCount` field bounds on `ticket-holders`. */
const MAX_PLUS_ONE_COUNT = 9

/** Duplicate ids in `members` are corrupt data; count each guest once. */
const uniqueMemberIds = (members: Array<string | { id: string }> | null | undefined): string[] => [
  ...new Set(relationshipIds(members)),
]

/**
 * How many plus-ones each member of a table is allowed, read from the event's
 * guest list. The seat plan and the capacity ledger both use this, so a guest
 * can never be given more plus-one seats than their ticket allows.
 *
 * Members whose account no longer exists (or who have no username) are absent
 * from the map and are treated as zero plus-ones.
 */
export const getPlusOneAllowances = async (
  payload: Payload,
  eventId: string,
  members: Array<string | { id: string }> | null | undefined,
): Promise<Map<string, number>> => {
  const memberIds = uniqueMemberIds(members)
  const allowances = new Map<string, number>()

  if (memberIds.length === 0) return allowances

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
    plusOnesBySotonId.set(
      key,
      Math.max(plusOnesBySotonId.get(key) ?? 0, Math.min(MAX_PLUS_ONE_COUNT, Math.max(0, count))),
    )
  }

  for (const user of users.docs) {
    allowances.set(user.id, plusOnesBySotonId.get(normalizeSotonId(user.username as string)) ?? 0)
  }

  return allowances
}

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
  const memberIds = uniqueMemberIds(members)
  if (memberIds.length === 0) return 0

  const allowances = await getPlusOneAllowances(payload, eventId, memberIds)

  let total = 0
  for (const id of memberIds) {
    // Members whose user record has since been deleted still occupy a seat.
    total += 1 + (allowances.get(id) ?? 0)
  }

  return total
}
