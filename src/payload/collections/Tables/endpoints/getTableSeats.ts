import type { PayloadHandler } from 'payload/config'

import type { SeatSlot } from '../../../../utilities/booking/seats'
import { normalizeTableNameMode, tableDisplayName } from '../../../../utilities/booking/tableName'
import { rankTables } from '../../../../utilities/booking/tableNumbers'
import { isAdmin } from '../../../access/isAdmin'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import { loadTableMemberContext } from '../../../utilities/tableMembers'
import { currentSeatRows } from '../../../utilities/tableSeats'
import { getTableByJoinCode } from './getTableByJoinCode'

/**
 * A table's seat plan. Any signed-in user may view it so a shared link works as an
 * invite; joining remains gated by the guest list, the lock, the booking window
 * and the remaining capacity.
 */
export const getTableSeats: PayloadHandler = async (req, res) => {
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

  const eventTables = await payload.find({
    collection: 'tables',
    where: { event: { equals: eventId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const tableNumber =
    rankTables(
      eventTables.docs.filter(candidate => relationshipIds(candidate.members).length > 0),
    ).get(table.id) ?? null

  const memberIds = relationshipIds(table.members)
  const isMember = memberIds.includes(user.id)
  const admin = isAdmin(user)
  const isOwner = relationshipId(table.owner) === user.id
  const seatsPerTable = event.seatsPerTable || 10
  const memberCount = table.memberCount || 0
  const full = memberCount >= seatsPerTable

  // The stored seat rows are normalised in one place (bounds, stale members,
  // duplicate indexes) so the plan, the export and the save path agree.
  const seats: SeatSlot[] = Array(seatsPerTable).fill(null)
  for (const seat of currentSeatRows(table.seatPositions, memberIds, seatsPerTable)) {
    seats[seat.seatIndex] = {
      userId: seat.userId ?? null,
      plusOneOf: seat.plusOneOf ?? null,
      name: seat.name,
    }
  }

  const { users, displayNameById, plusOneAllowances } = await loadTableMemberContext(
    payload,
    eventId,
    memberIds,
  )
  const members = users.map(member => ({
    id: member.id,
    name: displayNameById.get(member.id) ?? 'Unknown',
    plusOneCount: plusOneAllowances.get(member.id) ?? 0,
  }))

  const ownerId = relationshipId(table.owner)
  let ownerName: string | null = null
  let ownerUsername: string | null = null
  if (ownerId) {
    try {
      const owner = await payload.findByID({
        collection: 'users',
        id: ownerId,
        depth: 0,
        overrideAccess: true,
      })
      ownerName = (owner.name as string) ?? null
      ownerUsername = (owner.username as string) ?? null
    } catch {
      // A deleted owner just falls back to the join code label.
    }
  }

  const nameMode = normalizeTableNameMode(table.nameMode)

  return res.json({
    seats,
    members,
    isMember,
    isOwner,
    isAdmin: admin,
    locked: Boolean(table.locked),
    full,
    bookingOpen: Boolean(event.isOpen),
    canJoin: !isMember && !table.locked && Boolean(event.isOpen) && !full,
    joinCode: table.joinCode,
    name: tableDisplayName({
      nameMode,
      joinCode: table.joinCode,
      ownerName,
      ownerUsername,
    }),
    tableNumber,
    nameMode,
    eventSlug: event.slug,
  })
}
