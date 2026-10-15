import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import { normalizeSotonId } from '../../../utilities/sotonId'
import { getTableByJoinCode } from './getTableByJoinCode'

export const joinTable: PayloadHandler = async (req, res) => {
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
  const newMemberUsage = 1 + plusOneCount
  const seatsPerTable = event.seatsPerTable || 10

  // Everything below has to happen against a fresh read: two people tapping
  // "Join" at the same moment would otherwise both pass the capacity check and
  // one would be dropped from `members` without an error.
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

    if (current.locked && !isAdmin(user)) {
      return res.status(403).json({ error: 'This table is locked' })
    }

    const members = relationshipIds(current.members)

    if (members.includes(user.id)) {
      return res.status(400).json({ error: 'You are already at this table' })
    }

    const currentUsage = (current.memberCount as number) || 0
    if (currentUsage + newMemberUsage > seatsPerTable && !isAdmin(user)) {
      return res.status(400).json({
        error: `Table is full. You need ${newMemberUsage} seat(s) but only ${
          seatsPerTable - currentUsage
        } are available.`,
      })
    }

    const otherTables = await payload.find({
      collection: 'tables',
      where: {
        event: { equals: eventId },
        members: { contains: user.id },
        id: { not_equals: table.id },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (otherTables.totalDocs > 0) {
      return res.status(400).json({
        error: 'You are already in a table. Leave your current table first.',
        existingTable: otherTables.docs[0].joinCode,
      })
    }

    try {
      // The beforeChange hook recomputes `memberCount` from the guest list.
      await payload.update({
        collection: 'tables',
        id: table.id,
        data: { members: [...members, user.id] },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to join this table'
      return res.status(400).json({ error: message })
    }

    return res.json({
      success: true,
      table: { id: table.id, joinCode: current.joinCode || table.joinCode },
    })
  })
}
