import type { PayloadHandler } from 'payload/config'

import { formatSeatPlanCsv, type SeatPlanRow } from '../../../../utilities/booking/seatPlanCsv'
import { rankTables } from '../../../../utilities/booking/tableNumbers'
import { isAdmin } from '../../../access/isAdmin'
import {
  asString,
  csvFileNamePart,
  loadBookingEvent,
  loadHoldersBySotonId,
} from '../../../utilities/booking'
import { relationshipIds } from '../../../utilities/relationships'
import { normalizeSotonId } from '../../../utilities/sotonId'
import { loadTableMemberContext } from '../../../utilities/tableMembers'
import { currentSeatRows } from '../../../utilities/tableSeats'

/**
 * Downloads the venue seating plan for an event: table number, seat number, guest
 * name, guest type (normal/plusone), ticket holder and the guest's username. It
 * also lists table members who have not picked a seat and ticket holders who have
 * not joined a table, so nobody is silently left out. Allergies and meal choices
 * are handled separately and are not part of this export.
 */
export const exportSeatPlan: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user || !isAdmin(user)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const eventId = asString(req.query?.eventId)
  if (!eventId) {
    return res.status(400).json({ error: 'Missing "eventId" query parameter' })
  }

  const event = await loadBookingEvent(payload, eventId)
  if (!event) {
    return res.status(400).json({ error: 'Event not found' })
  }

  const tablesResult = await payload.find({
    collection: 'tables',
    where: { event: { equals: eventId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const seatsPerTable = event.seatsPerTable || 10
  const activeTables = tablesResult.docs.filter(table => relationshipIds(table.members).length > 0)
  const tableNumbers = rankTables(activeTables)
  const holders = await loadHoldersBySotonId(payload, eventId)

  const memberIds = [...new Set(activeTables.flatMap(table => relationshipIds(table.members)))]
  const { users, displayNameById, sotonIdById, plusOneAllowances } = await loadTableMemberContext(
    payload,
    eventId,
    memberIds,
  )
  const memberSotonIds = new Set(
    users.map(member => sotonIdById.get(member.id)).filter((id): id is string => Boolean(id)),
  )

  const displayNameFor = (memberId: string): string => displayNameById.get(memberId) ?? 'Unknown'
  const sotonIdFor = (memberId: string): string => sotonIdById.get(memberId) ?? ''

  const rows: SeatPlanRow[] = []

  for (const table of activeTables) {
    const tableNumber = tableNumbers.get(table.id) ?? null
    const tableMemberIds = relationshipIds(table.members)
    const seatedMemberIds = new Set<string>()
    const placedPlusOnes = new Map<string, number>()

    // Bounds, stale members and duplicate seat indexes are handled consistently
    // with the seats endpoint.
    const seats = currentSeatRows(table.seatPositions, tableMemberIds, seatsPerTable)

    for (const seat of seats) {
      const userId = seat.userId
      const plusOneOf = seat.plusOneOf

      if (userId) {
        seatedMemberIds.add(userId)
        const name = displayNameFor(userId)
        rows.push({
          tableNumber,
          seatNumber: seat.seatIndex + 1,
          guestName: name,
          guestType: 'normal',
          ticketHolder: name,
          sotonId: sotonIdFor(userId),
        })
        continue
      }

      if (plusOneOf) {
        // Plus-ones have no account or real name on file; the ticket holder
        // column is what identifies them.
        placedPlusOnes.set(plusOneOf, (placedPlusOnes.get(plusOneOf) ?? 0) + 1)
        rows.push({
          tableNumber,
          seatNumber: seat.seatIndex + 1,
          guestName: '',
          guestType: 'plusone',
          ticketHolder: displayNameFor(plusOneOf),
          sotonId: '',
        })
        continue
      }

      // A legacy row that only carries a display name.
      rows.push({
        tableNumber,
        seatNumber: seat.seatIndex + 1,
        guestName: (seat.name ?? '').trim(),
        guestType: 'normal',
        ticketHolder: '',
        sotonId: '',
      })
    }

    for (const memberId of tableMemberIds) {
      if (seatedMemberIds.has(memberId)) continue
      const name = displayNameFor(memberId)
      rows.push({
        tableNumber,
        seatNumber: null,
        guestName: name,
        guestType: 'normal',
        ticketHolder: name,
        sotonId: sotonIdFor(memberId),
      })
    }

    for (const memberId of tableMemberIds) {
      const placed = placedPlusOnes.get(memberId) ?? 0
      const allowance = plusOneAllowances.get(memberId) ?? 0
      const ticketHolder = displayNameFor(memberId)

      for (let position = placed; position < allowance; position++) {
        rows.push({
          tableNumber,
          seatNumber: null,
          guestName: '',
          guestType: 'plusone',
          ticketHolder,
          sotonId: '',
        })
      }
    }
  }

  // Ticket holders who never joined a table, so the committee can chase them.
  for (const [sotonId, holder] of holders) {
    if (memberSotonIds.has(sotonId)) continue
    const name = (holder.name as string) || sotonId
    rows.push({
      tableNumber: null,
      seatNumber: null,
      guestName: name,
      guestType: 'normal',
      ticketHolder: name,
      sotonId: normalizeSotonId(holder.sotonId),
    })
  }

  const csv = formatSeatPlanCsv(rows)
  const slug = csvFileNamePart(event.slug || event.name) || `event-${event.id}`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-seat-plan.csv"`)
  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).send(csv)
}
