import type { PayloadHandler } from 'payload/config'

import { formatSeatPlanCsv, type SeatPlanRow } from '../../../../utilities/booking/seatPlanCsv'
import { firstNameOf, plusOneSeatLabel } from '../../../../utilities/booking/tableName'
import { rankTables } from '../../../../utilities/booking/tableNumbers'
import { isAdmin } from '../../../access/isAdmin'
import type { User } from '../../../payload-types'
import {
  accountDisplayName,
  asString,
  csvFileNamePart,
  loadBookingEvent,
  loadHoldersBySotonId,
} from '../../../utilities/booking'
import { getPlusOneAllowances } from '../../../utilities/memberCount'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import { normalizeSotonId } from '../../../utilities/sotonId'

/**
 * Downloads the venue seating plan for an event. Every guest gets a row with the
 * table number and seat number shown on the booking pages, plus ticket holders
 * who never joined a table (so nobody is silently left out). Meal choices and the
 * final checks column are intentionally blank.
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

  const activeTables = tablesResult.docs.filter(table => relationshipIds(table.members).length > 0)
  const tableNumbers = rankTables(activeTables)
  const holders = await loadHoldersBySotonId(payload, eventId)

  const memberIds = [...new Set(activeTables.flatMap(table => relationshipIds(table.members)))]
  const users =
    memberIds.length > 0
      ? ((
          await payload.find({
            collection: 'users',
            where: { id: { in: memberIds } },
            pagination: false,
            depth: 0,
            overrideAccess: true,
          })
        ).docs as User[])
      : []

  const userById = new Map(users.map(member => [member.id, member]))
  const displayNameById = new Map(
    users.map(member => [
      member.id,
      accountDisplayName(member) || (member.username as string) || 'Unknown',
    ]),
  )
  const plusOneAllowances = await getPlusOneAllowances(payload, eventId, memberIds)
  const memberSotonIds = new Set(
    users.map(member => normalizeSotonId(member.username)).filter(Boolean),
  )

  const displayNameFor = (memberId: string): string => displayNameById.get(memberId) ?? 'Unknown'

  const firstNameFor = (memberId: string): string => {
    const member = userById.get(memberId)
    return firstNameOf(member?.name, member?.username)
  }

  const allergiesFor = (memberId: string): string => {
    const member = userById.get(memberId)
    return holders.get(normalizeSotonId(member?.username))?.dietaryRequirements ?? ''
  }

  const rows: SeatPlanRow[] = []

  for (const table of activeTables) {
    const tableNumber = tableNumbers.get(table.id) ?? null
    const tableMemberIds = relationshipIds(table.members)
    const seatedMemberIds = new Set<string>()
    const placedPlusOnes = new Map<string, number>()

    const seats = [...(table.seatPositions ?? [])].sort((a, b) => a.seatIndex - b.seatIndex)

    for (const seat of seats) {
      if (!Number.isInteger(seat.seatIndex) || seat.seatIndex < 0) continue

      const userId = relationshipId((seat as { userId?: unknown }).userId)
      const plusOneOf = relationshipId((seat as { plusOneOf?: unknown }).plusOneOf)

      // Seats left behind by a guest who has left the table are stale, exactly
      // as the seat-plan endpoint treats them.
      if (userId && !tableMemberIds.includes(userId)) continue
      if (plusOneOf && !tableMemberIds.includes(plusOneOf)) continue

      if (userId) {
        seatedMemberIds.add(userId)
        const name = displayNameFor(userId)
        rows.push({
          tableNumber,
          seatNumber: seat.seatIndex + 1,
          guestName: name,
          allergies: allergiesFor(userId),
          guestType: 'Member',
          ticketHolder: name,
        })
        continue
      }

      if (plusOneOf) {
        const position = (placedPlusOnes.get(plusOneOf) ?? 0) + 1
        placedPlusOnes.set(plusOneOf, position)
        rows.push({
          tableNumber,
          seatNumber: seat.seatIndex + 1,
          guestName:
            (seat.name ?? '').trim() || plusOneSeatLabel(firstNameFor(plusOneOf), position),
          allergies: '',
          guestType: 'Plus-one',
          ticketHolder: displayNameFor(plusOneOf),
        })
        continue
      }

      // A legacy row that only carries a display name.
      rows.push({
        tableNumber,
        seatNumber: seat.seatIndex + 1,
        guestName: (seat.name ?? '').trim() || 'Guest',
        allergies: '',
        guestType: 'Guest',
        ticketHolder: '',
      })
    }

    for (const memberId of tableMemberIds) {
      if (seatedMemberIds.has(memberId)) continue
      const name = displayNameFor(memberId)
      rows.push({
        tableNumber,
        seatNumber: null,
        guestName: name,
        allergies: allergiesFor(memberId),
        guestType: 'Member',
        ticketHolder: name,
      })
    }

    for (const memberId of tableMemberIds) {
      const placed = placedPlusOnes.get(memberId) ?? 0
      const allowance = plusOneAllowances.get(memberId) ?? 0
      const ticketHolder = displayNameFor(memberId)

      for (let position = placed + 1; position <= allowance; position++) {
        rows.push({
          tableNumber,
          seatNumber: null,
          guestName: plusOneSeatLabel(firstNameFor(memberId), position),
          allergies: '',
          guestType: 'Plus-one',
          ticketHolder,
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
      allergies: holder.dietaryRequirements ?? '',
      guestType: 'Member',
      ticketHolder: name,
    })
  }

  const csv = formatSeatPlanCsv(rows)
  const slug = csvFileNamePart(event.slug || event.name) || `event-${event.id}`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-seat-plan.csv"`)
  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).send(csv)
}
