import { randomInt } from 'crypto'
import { APIError } from 'payload/errors'
import type { PayloadRequest } from 'payload/types'

import { isAdmin } from '../../../access/isAdmin'
import { computeMemberCount } from '../../../utilities/memberCount'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Join codes are the only identifier users share, so they are generated from a
 * crypto RNG rather than Math.random.
 */
export const generateJoinCode = (): string => {
  let result = ''
  for (let i = 0; i < 8; i++) {
    const index = randomInt(0, CHARS.length)
    result += CHARS[index]
  }
  return result
}

/**
 * True when a create failed because the generated join code already existed.
 * The Mongo adapter maps duplicate keys to a `ValidationError` naming the field.
 */
export const isJoinCodeCollision = (error: unknown): boolean => {
  const data = (error as { data?: Array<{ field?: string }> } | null)?.data
  if (Array.isArray(data) && data.some(entry => entry?.field === 'joinCode')) {
    return true
  }
  // Fall back to the raw driver code — the adapter only rewrites it when MongoDB
  // reports the offending key, which is not guaranteed for every duplicate.
  return (error as { code?: number } | null)?.code === 11000
}

/**
 * Keeps every table write honest, wherever it comes from. Running these checks
 * as a collection hook rather than only inside the custom endpoints means an
 * admin edit through the generic REST API cannot corrupt the capacity ledger or
 * put a guest at two tables.
 *
 * Note that a collection-level `beforeChange` on an update receives only the
 * incoming fields, not the merged document, so anything derived from `members`
 * has to fall back to `originalDoc`.
 */
export const beforeTableChange = async ({
  data,
  originalDoc,
  operation,
  req,
}: {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  operation: 'create' | 'update'
  req: PayloadRequest
}): Promise<Record<string, unknown>> => {
  // Only mint a code when the table is first created. Generating one on updates
  // rotated the code (and broke every shared link) on join, leave, lock and
  // seat-save, because `data` on an update only carries the incoming fields.
  if (operation === 'create' && !data.joinCode) {
    data.joinCode = generateJoinCode()
  }

  const eventId = relationshipId(data.event) ?? relationshipId(originalDoc?.event)
  if (!eventId) {
    throw new APIError('A table must belong to an event.', 400)
  }

  const members =
    'members' in data ? relationshipIds(data.members) : relationshipIds(originalDoc?.members)

  // The ledger is always derived, never incremented, so re-importing the guest
  // list mid-booking cannot leave it out of step with `members`.
  const memberCount = await computeMemberCount(req.payload, eventId, members)
  data.memberCount = memberCount

  const previousMembers = operation === 'create' ? [] : relationshipIds(originalDoc?.members)
  const addedMembers = members.filter(id => !previousMembers.includes(id))

  // Roster invariants only matter when the roster actually changes, so a lock
  // toggle or a seat save never fails because of unrelated legacy data.
  if (addedMembers.length === 0) {
    return data
  }

  const event = await req.payload.findByID({
    collection: 'booking-events',
    id: eventId,
    depth: 0,
  })
  const seatsPerTable = event.seatsPerTable || 10

  if (memberCount > seatsPerTable && !isAdmin(req.user)) {
    throw new APIError(
      `A table seats ${seatsPerTable} guests; this party needs ${memberCount}.`,
      400,
    )
  }

  const tableId = relationshipId(originalDoc?.id)

  for (const memberId of addedMembers) {
    const clashes = await req.payload.find({
      collection: 'tables',
      where: {
        event: { equals: eventId },
        members: { contains: memberId },
        ...(tableId ? { id: { not_equals: tableId } } : {}),
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (clashes.totalDocs > 0) {
      throw new APIError('A guest can only sit at one table per event.', 400)
    }
  }

  return data
}
