import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { getTableByJoinCode } from './getTableByJoinCode'

export const manageSeats: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const isMember =
    Array.isArray(table.members) &&
    table.members.some((m: string | { id: string }) => {
      return typeof m === 'string' ? m === user.id : m.id === user.id
    })

  if (!isMember && !isAdmin(user)) {
    return res.status(403).json({ error: 'Only table members can manage seats' })
  }

  const eventId = typeof table.event === 'string' ? table.event : table.event?.id
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

  const { seatPositions } = req.body as {
    seatPositions?: Array<{ seatIndex: number; name: string }>
  }

  if (!Array.isArray(seatPositions)) {
    return res.status(400).json({ error: 'seatPositions must be an array' })
  }

  const seatsPerTable = event.seatsPerTable || 10
  if (seatPositions.length > seatsPerTable) {
    return res.status(400).json({ error: `A table has at most ${seatsPerTable} seats` })
  }

  const assignedSeats = new Set<number>()
  for (const s of seatPositions) {
    if (
      !Number.isInteger(s.seatIndex) ||
      s.seatIndex < 0 ||
      s.seatIndex >= seatsPerTable ||
      typeof s.name !== 'string' ||
      !s.name.trim() ||
      s.name.length > 100
    ) {
      return res.status(400).json({
        error: 'Each seat must have a unique valid index and a name of up to 100 characters',
      })
    }
    if (assignedSeats.has(s.seatIndex)) {
      return res.status(400).json({ error: 'A seat can only be assigned once' })
    }
    assignedSeats.add(s.seatIndex)
  }

  await payload.update({
    collection: 'tables',
    id: table.id,
    data: {
      seatPositions,
    },
  })

  return res.json({ success: true })
}
