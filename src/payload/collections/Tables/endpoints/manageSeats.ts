import type { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'

import {
  isSeatIndexValid,
  plusOneSeatNames,
  type SeatRow,
} from '../../../../utilities/booking/seats'
import { firstNameOf } from '../../../../utilities/booking/tableName'
import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { getPlusOneAllowances } from '../../../utilities/memberCount'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import {
  isSeatStale,
  normaliseSeatRows,
  plusOneCountsByMember,
} from '../../../utilities/tableSeats'
import { getTableByJoinCode } from './getTableByJoinCode'

/** A seat as submitted by the client; fields are unknown until validated. */
interface IncomingSeat {
  seatIndex?: unknown
  userId?: unknown
  plusOneOf?: unknown
  name?: unknown
}

interface SeatMemberContext {
  /** Full display name, used for the stored seat rows. */
  nameById: Map<string, string>
  /** First name, used for plus-one labels. */
  firstNameById: Map<string, string>
  plusOneAllowances: Map<string, number>
}

const displayName = (user: { name?: string | null; username?: string | null }): string =>
  user.name || user.username || 'Unknown'

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * Names and plus-one allowances for everyone at the table. A member whose account
 * no longer exists keeps a seat but gets no plus-one allowance, because there is
 * no guest-list row to grant one.
 */
const loadSeatMemberContext = async (
  payload: Payload,
  eventId: string,
  members: string[],
): Promise<SeatMemberContext> => {
  const users = await payload.find({
    collection: 'users',
    where: { id: { in: members } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  return {
    nameById: new Map(users.docs.map(user => [user.id, displayName(user)])),
    firstNameById: new Map(
      users.docs.map(user => [user.id, firstNameOf(user.name, user.username)]),
    ),
    plusOneAllowances: await getPlusOneAllowances(payload, eventId, members),
  }
}

export const manageSeats: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const eventId = relationshipId(table.event)
  if (!eventId) {
    return res.status(500).json({ error: 'Table has no event' })
  }

  let event
  try {
    event = await payload.findByID({
      collection: 'booking-events',
      id: eventId,
      depth: 0,
    })
  } catch {
    return res.status(500).json({ error: 'Event not found' })
  }

  const { seatPositions: incoming } = (req.body as { seatPositions?: IncomingSeat[] }) || {}

  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: 'seatPositions must be an array' })
  }

  return withKeyedLock(`table:${table.id}`, async () => {
    const current = await payload.findByID({
      collection: 'tables',
      id: table.id,
      depth: 0,
      overrideAccess: true,
    })

    if (!current) {
      return res.status(404).json({ error: 'Table not found' })
    }

    const admin = isAdmin(user)
    const members = relationshipIds(current.members)
    const isMember = members.includes(user.id)
    const isOwner = relationshipId(current.owner) === user.id

    if (!isMember && !admin) {
      return res.status(403).json({ error: 'Only table members can manage seats' })
    }

    // Editing seats stays available after booking closes; only the table lock
    // freezes the plan.
    if (current.locked && !admin) {
      return res
        .status(403)
        .json({ error: 'This table is locked. Ask the table owner to unlock it.' })
    }

    const seatsPerTable = event.seatsPerTable || 10
    const { nameById, firstNameById, plusOneAllowances } = await loadSeatMemberContext(
      payload,
      eventId,
      members,
    )

    const storedSeats = normaliseSeatRows(current.seatPositions)
    const storedByIndex = new Map(storedSeats.map(seat => [seat.seatIndex, seat]))

    const placedPlusOnes = new Map<string, number>()
    const assignedSeats = new Set<number>()
    const seatPositions: SeatRow[] = []

    for (const seat of incoming) {
      const seatIndex = seat?.seatIndex

      if (!isSeatIndexValid(seatIndex, seatsPerTable)) {
        return res.status(400).json({
          error: `Seat numbers must be whole numbers between 1 and ${seatsPerTable}`,
        })
      }

      if (assignedSeats.has(seatIndex)) {
        return res.status(400).json({ error: 'A seat can only be assigned once' })
      }
      assignedSeats.add(seatIndex)

      const seatUserId = relationshipId(seat.userId)
      const plusOneOf = relationshipId(seat.plusOneOf)

      if (seatUserId && plusOneOf) {
        return res.status(400).json({ error: 'A seat cannot be both a guest and a plus-one' })
      }

      if (seatUserId) {
        if (!members.includes(seatUserId)) {
          return res.status(400).json({
            error: 'Seats can only be assigned to guests at this table',
          })
        }

        seatPositions.push({
          seatIndex,
          userId: seatUserId,
          // Display names are derived server-side so a client cannot write
          // arbitrary text into the seating chart.
          name: nameById.get(seatUserId) ?? 'Unknown',
        })
        continue
      }

      if (plusOneOf) {
        if (!members.includes(plusOneOf)) {
          return res
            .status(400)
            .json({ error: 'Plus-one seats must belong to a guest at this table' })
        }

        placedPlusOnes.set(plusOneOf, (placedPlusOnes.get(plusOneOf) ?? 0) + 1)
        seatPositions.push({ seatIndex, plusOneOf, name: '' })
        continue
      }

      // Legacy payloads (and pre-`userId` rows) carry a display name only. They
      // may be re-saved unchanged, but a brand-new free-text seat is refused so a
      // table cannot be stuffed beyond its guest list.
      const name = typeof seat.name === 'string' ? seat.name.trim() : ''
      const stored = storedByIndex.get(seatIndex)

      if (stored && !stored.userId && !stored.plusOneOf && stored.name === name && name) {
        seatPositions.push({ seatIndex, name })
        continue
      }

      return res.status(400).json({
        error:
          'Each seat needs a guest at this table or one of their plus-ones. Add a plus-one seat instead of a free-text name.',
      })
    }

    // A guest cannot be handed more plus-one seats than their ticket allows.
    // Seats that already existed survive a later allowance reduction, so this only
    // rejects *new* seats beyond the current allowance.
    const existingPlusOnes = plusOneCountsByMember(storedSeats)
    for (const [memberId, count] of placedPlusOnes) {
      const allowance = plusOneAllowances.get(memberId) ?? 0
      const alreadyPlaced = existingPlusOnes.get(memberId) ?? 0

      if (count > allowance && count > alreadyPlaced) {
        const who = firstNameById.get(memberId) || 'That guest'

        return res.status(400).json({
          error:
            allowance === 0
              ? `${who} has no plus-ones on the guest list for this event.`
              : `${who}'s ticket allows ${plural(
                  allowance,
                  'plus-one',
                )}; ${count} seats were placed.`,
        })
      }
    }

    // Plus-one labels are derived from the member and their seat order, so the
    // client never writes arbitrary text there either.
    const plusOneNames = plusOneSeatNames(
      seatPositions,
      memberId => firstNameById.get(memberId) ?? '',
    )
    for (const seat of seatPositions) {
      if (!seat.plusOneOf) continue
      seat.name = plusOneNames.get(seat.seatIndex) ?? ''
    }

    // A guest holds at most one seat. The UI already moves people rather than
    // cloning them, but the API has to enforce it.
    const seatedUsers = new Set<string>()
    for (const seat of seatPositions) {
      if (!seat.userId) continue
      if (seatedUsers.has(seat.userId)) {
        return res.status(400).json({ error: 'A guest can only hold one seat' })
      }
      seatedUsers.add(seat.userId)
    }

    // Members may only move their own seat and their own plus-one seats; the table
    // owner (or an admin) can rearrange everyone. Without this, any member could
    // shuffle the whole table.
    if (!isOwner && !admin) {
      const myName = (user.name as string) || (user.username as string) || ''

      const signature = (entry?: SeatRow): string | null => {
        if (!entry) return null
        if (entry.userId) return `user:${entry.userId}`
        if (entry.plusOneOf) return `plus:${entry.plusOneOf}`
        // Legacy rows carry only a display name; treat the viewer's own name as theirs.
        if (entry.name && entry.name === myName) return `user:${user.id}`
        return entry.name ? `name:${entry.name}` : null
      }

      const isMine = (value: string | null): boolean =>
        value === null || value === `user:${user.id}` || value === `plus:${user.id}`

      const submitted = new Map(seatPositions.map(seat => [seat.seatIndex, seat]))

      for (const index of new Set([...storedByIndex.keys(), ...submitted.keys()])) {
        const stored = storedByIndex.get(index)

        // Pruning a seat whose guest has since left the table is always allowed;
        // otherwise a member could not save the plan the seat endpoint shows them.
        if (stored && isSeatStale(stored, members)) continue

        const before = signature(stored)
        const after = signature(submitted.get(index))
        if (before === after) continue

        if (!isMine(before) || !isMine(after)) {
          return res.status(403).json({
            error:
              'You can only move your own seat and your own plus-ones. Ask the table owner to rearrange the others.',
          })
        }
      }
    }

    try {
      await payload.update({
        collection: 'tables',
        id: current.id,
        data: {
          seatPositions,
        },
      })
    } catch (err: unknown) {
      // Custom endpoints have no async rejection guard — respond rather than throw.
      const message = err instanceof Error ? err.message : 'Unable to save seats'
      return res.status(400).json({ error: message })
    }

    return res.json({ success: true })
  })
}
