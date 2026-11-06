import type { PayloadHandler } from 'payload/config'

import { firstNameOf, plusOneSeatLabel } from '../../../../utilities/booking/tableName'
import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { getPlusOneAllowances } from '../../../utilities/memberCount'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import { getTableByJoinCode } from './getTableByJoinCode'

interface IncomingSeat {
  seatIndex?: unknown
  userId?: unknown
  plusOneOf?: unknown
  name?: unknown
}

/** A seat as stored or as built from the request. */
interface SeatEntry {
  seatIndex: number
  userId?: string
  plusOneOf?: string
  name: string
}

const displayName = (user: { name?: string | null; username?: string | null }): string =>
  user.name || user.username || 'Unknown'

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

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

    const usersResult = await payload.find({
      collection: 'users',
      where: { id: { in: members } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    const docById = new Map(usersResult.docs.map(u => [u.id, u]))
    const nameById = new Map(
      usersResult.docs.map(u => [
        u.id,
        displayName(u as { name?: string | null; username?: string | null }),
      ]),
    )
    // A member whose account no longer exists keeps a seat, but cannot hold
    // plus-one seats because there is no guest-list row to grant them.
    const plusOneAllowances = await getPlusOneAllowances(payload, eventId, members)

    const storedSeats: SeatEntry[] = (current.seatPositions ?? []).map(seat => ({
      seatIndex: seat.seatIndex,
      userId: relationshipId((seat as { userId?: unknown }).userId),
      plusOneOf: relationshipId((seat as { plusOneOf?: unknown }).plusOneOf),
      name: typeof seat.name === 'string' ? seat.name.trim() : '',
    }))
    const storedByIndex = new Map(storedSeats.map(seat => [seat.seatIndex, seat]))

    const placedPlusOnes = new Map<string, number>()
    const existingPlusOnes = new Map<string, number>()
    for (const seat of storedSeats) {
      if (!seat.plusOneOf) continue
      existingPlusOnes.set(seat.plusOneOf, (existingPlusOnes.get(seat.plusOneOf) ?? 0) + 1)
    }

    const assignedSeats = new Set<number>()
    const seatPositions: SeatEntry[] = []

    for (const seat of incoming) {
      const seatIndex = seat?.seatIndex

      if (
        !Number.isInteger(seatIndex) ||
        (seatIndex as number) < 0 ||
        (seatIndex as number) >= seatsPerTable
      ) {
        return res.status(400).json({
          error: `Seat numbers must be whole numbers between 1 and ${seatsPerTable}`,
        })
      }

      if (assignedSeats.has(seatIndex as number)) {
        return res.status(400).json({ error: 'A seat can only be assigned once' })
      }
      assignedSeats.add(seatIndex as number)

      const seatUserId = relationshipId(seat?.userId)
      const plusOneOf = relationshipId(seat?.plusOneOf)

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
          seatIndex: seatIndex as number,
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
        seatPositions.push({ seatIndex: seatIndex as number, plusOneOf, name: '' })
        continue
      }

      // Legacy payloads (and pre-`userId` rows) carry a display name only. They
      // may be re-saved unchanged, but a brand-new free-text seat is refused so
      // a table cannot be stuffed beyond its guest list.
      const name = typeof seat?.name === 'string' ? seat.name.trim() : ''
      const stored = storedByIndex.get(seatIndex as number)

      if (stored && !stored.userId && !stored.plusOneOf && stored.name === name && name) {
        seatPositions.push({ seatIndex: seatIndex as number, name })
        continue
      }

      return res.status(400).json({
        error:
          'Each seat needs a guest at this table or one of their plus-ones. Add a plus-one seat instead of a free-text name.',
      })
    }

    // A guest cannot be handed more plus-one seats than their ticket allows.
    // Seats that already existed survive a later allowance reduction, so this
    // only rejects *new* seats beyond the current allowance.
    for (const [memberId, count] of placedPlusOnes) {
      const allowance = plusOneAllowances.get(memberId) ?? 0
      const alreadyPlaced = existingPlusOnes.get(memberId) ?? 0

      if (count > allowance && count > alreadyPlaced) {
        const member = docById.get(memberId)
        const who = firstNameOf(member?.name, member?.username) || 'That guest'

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

    // Plus-one labels are derived from the member and their order, so the client
    // never writes arbitrary text there either.
    const byMember = new Map<string, SeatEntry[]>()
    for (const seat of seatPositions) {
      if (!seat.plusOneOf) continue
      const list = byMember.get(seat.plusOneOf) ?? []
      list.push(seat)
      byMember.set(seat.plusOneOf, list)
    }
    for (const [memberId, seats] of byMember) {
      const member = docById.get(memberId)
      const first = firstNameOf(member?.name, member?.username)
      seats
        .slice()
        .sort((a, b) => a.seatIndex - b.seatIndex)
        .forEach((seat, index) => {
          seat.name = plusOneSeatLabel(first, index + 1)
        })
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

    // Members may only move their own seat and their own plus-one seats; the
    // table owner (or an admin) can rearrange everyone. Without this, any member
    // could shuffle the whole table.
    if (!isOwner && !admin) {
      const myName = (user.name as string) || (user.username as string) || ''

      const signature = (entry?: {
        userId?: string | null
        plusOneOf?: string | null
        name?: string | null
      }): string | null => {
        if (!entry) return null
        if (entry.userId) return `user:${entry.userId}`
        if (entry.plusOneOf) return `plus:${entry.plusOneOf}`
        // Legacy rows carry only a display name; treat the viewer's own name as theirs.
        if (entry.name && entry.name === myName) return `user:${user.id}`
        return entry.name ? `name:${entry.name}` : null
      }

      const mine = (value: string | null): boolean =>
        value === null || value === `user:${user.id}` || value === `plus:${user.id}`

      const submitted = new Map<number, SeatEntry>(
        seatPositions.map(seat => [seat.seatIndex, seat]),
      )

      const indexes = new Set<number>([...storedByIndex.keys(), ...submitted.keys()])
      for (const index of indexes) {
        const stored = storedByIndex.get(index)

        // Pruning a seat whose guest has since left the table is always allowed;
        // otherwise a member could not save the plan the seat endpoint shows them.
        const stale = Boolean(
          (stored?.userId && !members.includes(stored.userId)) ||
            (stored?.plusOneOf && !members.includes(stored.plusOneOf)),
        )
        if (stale) continue

        const before = signature(stored)
        const after = signature(submitted.get(index))
        if (before === after) continue

        if (!mine(before) || !mine(after)) {
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
