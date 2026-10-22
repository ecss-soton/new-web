import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import { getTableByJoinCode } from './getTableByJoinCode'

interface IncomingSeat {
  seatIndex?: unknown
  userId?: unknown
  name?: unknown
}

const displayName = (user: { name?: string | null; username?: string | null }): string =>
  user.name || user.username || 'Unknown'

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
    const nameById = new Map(
      usersResult.docs.map(u => [
        u.id,
        displayName(u as { name?: string | null; username?: string | null }),
      ]),
    )

    const assignedSeats = new Set<number>()
    const seatPositions: Array<{ seatIndex: number; userId?: string; name: string }> = []

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

      // Legacy payloads (and pre-`userId` rows) carry a display name only.
      const name = typeof seat?.name === 'string' ? seat.name.trim() : ''
      if (!name || name.length > 100) {
        return res.status(400).json({
          error: 'Each seat needs a guest of up to 100 characters',
        })
      }

      seatPositions.push({ seatIndex: seatIndex as number, name })
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

    // Members may only move their own seat; the table owner (or an admin) can
    // rearrange everyone. Without this, any member could shuffle the whole table.
    if (!isOwner && !admin) {
      const myName = (user.name as string) || (user.username as string) || ''

      const signature = (entry?: {
        userId?: string | null
        name?: string | null
      }): string | null => {
        if (!entry) return null
        if (entry.userId) return `user:${entry.userId}`
        // Legacy rows carry only a display name; treat the viewer's own name as theirs.
        if (entry.name && entry.name === myName) return `user:${user.id}`
        return entry.name ? `name:${entry.name}` : null
      }

      const existing = new Map<number, { userId?: string | null; name?: string | null }>()
      for (const seat of current.seatPositions ?? []) {
        existing.set(seat.seatIndex, {
          userId: relationshipId((seat as { userId?: unknown }).userId),
          name: typeof seat.name === 'string' ? seat.name.trim() : null,
        })
      }

      const submitted = new Map<number, { userId?: string | null; name?: string | null }>()
      for (const seat of seatPositions) {
        submitted.set(seat.seatIndex, { userId: seat.userId, name: seat.name })
      }

      const indexes = new Set<number>([...existing.keys(), ...submitted.keys()])
      for (const index of indexes) {
        const before = signature(existing.get(index))
        const after = signature(submitted.get(index))
        if (before === after) continue

        const mineBefore = before === null || before === `user:${user.id}`
        const mineAfter = after === null || after === `user:${user.id}`
        if (!mineBefore || !mineAfter) {
          return res.status(403).json({
            error: 'You can only move your own seat. Ask the table owner to rearrange the others.',
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
