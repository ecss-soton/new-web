import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipIds } from '../../../utilities/relationships'
import { normalizeSotonId } from '../../../utilities/sotonId'
import { isJoinCodeCollision } from '../hooks/beforeTableChange'

const CREATE_ATTEMPTS = 3

export const createTable: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const { eventId } = (req.body as { eventId?: string }) || {}

  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' })
  }

  let event
  try {
    event = await payload.findByID({
      collection: 'booking-events',
      id: eventId,
      depth: 0,
    })
  } catch {
    return res.status(400).json({ error: 'Event not found' })
  }

  if (!event.isOpen && !isAdmin(user)) {
    return res.status(403).json({ error: 'Table booking is currently closed' })
  }

  const ticketHolder = await payload.find({
    collection: 'ticket-holders',
    where: {
      sotonId: { equals: normalizeSotonId(user.username) },
      event: { equals: eventId },
    },
    limit: 1,
    depth: 0,
  })

  if (ticketHolder.totalDocs === 0 && !isAdmin(user)) {
    return res.status(403).json({
      error: 'You are not on the guest list for this event.',
    })
  }

  const plusOneCount = (ticketHolder.docs[0]?.plusOneCount as number) || 0
  const totalSeatUsage = 1 + plusOneCount
  const seatsPerTable = event.seatsPerTable || 10
  const maxTables = event.maxTables || 17

  // A guest who cannot fit at an empty table could never be seated at all.
  if (totalSeatUsage > seatsPerTable && !isAdmin(user)) {
    return res.status(400).json({
      error: `Your party needs ${totalSeatUsage} seats but a table only has ${seatsPerTable}.`,
    })
  }

  // Two simultaneous creates must not both pass the "one table per guest" and
  // `maxTables` checks — the second would otherwise overwrite or over-provision.
  return withKeyedLock(`event:${eventId}`, async () => {
    const existingTables = await payload.find({
      collection: 'tables',
      where: {
        members: { contains: user.id },
        event: { equals: eventId },
      },
      pagination: false,
      depth: 0,
    })

    if (existingTables.totalDocs > 0) {
      return res.status(400).json({
        error: 'You are already in a table. Leave your current table first.',
        existingTable: existingTables.docs[0].joinCode,
      })
    }

    const tableCount = await payload.find({
      collection: 'tables',
      where: { event: { equals: eventId } },
      pagination: false,
      depth: 0,
    })

    const activeTables = tableCount.docs.filter(t => relationshipIds(t.members).length > 0).length

    if (activeTables >= maxTables && !isAdmin(user)) {
      return res.status(400).json({
        error: `Maximum number of tables (${maxTables}) has been reached`,
      })
    }

    const seatName = user.name || user.username || 'You'

    // Join codes are random and unique-indexed; a collision is a 500 unless it is
    // retried with a freshly generated code.
    for (let attempt = 1; attempt <= CREATE_ATTEMPTS; attempt++) {
      try {
        const table = await payload.create({
          collection: 'tables',
          data: {
            joinCode: '', // replaced by the beforeChange hook
            event: eventId,
            owner: user.id,
            locked: false,
            members: [user.id],
            seatPositions: [{ seatIndex: 0, userId: user.id, name: seatName }],
          },
        })

        return res.json({ success: true, table: { id: table.id, joinCode: table.joinCode } })
      } catch (err: unknown) {
        // Payload mounts custom endpoints without an async rejection guard, so
        // anything thrown here would hang the request instead of erroring.
        if (attempt === CREATE_ATTEMPTS || !isJoinCodeCollision(err)) {
          const message = err instanceof Error ? err.message : 'Unable to create table'
          return res.status(400).json({ error: message })
        }
      }
    }

    return res.status(500).json({ error: 'Unable to generate a unique join code' })
  })
}
