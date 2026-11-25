import type { Payload } from 'payload'

import type { SeatRow } from '../../utilities/booking/seats'
import { firstNameOf } from '../../utilities/booking/tableName'
import type { Table, User } from '../payload-types'
import { accountDisplayName } from './booking'
import { getPlusOneAllowancesForUsers } from './memberCount'
import { relationshipId, relationshipIds } from './relationships'
import { normalizeSotonId } from './sotonId'
import { normaliseSeatRows } from './tableSeats'

export interface TableMemberContext {
  users: User[]
  displayNameById: Map<string, string>
  firstNameById: Map<string, string>
  sotonIdById: Map<string, string>
  plusOneAllowances: Map<string, number>
}

/**
 * Loads the accounts at a table together with the display names the seat plan,
 * export and seat names need, plus their guest-list plus-one allowances. One
 * query instead of each caller repeating the same lookups.
 */
export const loadTableMemberContext = async (
  payload: Payload,
  eventId: string,
  memberIds: string[],
): Promise<TableMemberContext> => {
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

  return {
    users,
    displayNameById: new Map(
      users.map(user => [
        user.id,
        accountDisplayName(user) || (user.username as string) || 'Unknown',
      ]),
    ),
    firstNameById: new Map(users.map(user => [user.id, firstNameOf(user.name, user.username)])),
    sotonIdById: new Map(users.map(user => [user.id, normalizeSotonId(user.username)])),
    plusOneAllowances: await getPlusOneAllowancesForUsers(payload, eventId, users),
  }
}

export interface RemoveMemberResult {
  /** True when the table had no members left and was deleted. */
  deleted: boolean
}

/**
 * Drops the seats belonging to a departing member, including the seats their
 * plus-ones were placed in. New rows are keyed by `userId`/`plusOneOf`; rows
 * written before those fields existed only carry a display name, so those fall
 * back to a name match (ambiguous when two members share a name — they are
 * rewritten with a `userId` on the next seat save).
 */
export const removeMemberSeats = (
  seatPositions: unknown,
  userId: string,
  userName: string,
): SeatRow[] =>
  normaliseSeatRows(seatPositions).filter(seat => {
    if (seat.userId) return seat.userId !== userId
    if (seat.plusOneOf === userId) return false
    return !userName || seat.name !== userName
  })

/**
 * Removes one member from a table, clearing their seats and handing ownership to
 * the longest-standing remaining member. A table that loses its last member is
 * deleted (an owner is required, and an empty table has no purpose).
 *
 * The caller must hold the `table:<id>` keyed lock and must have checked that the
 * member is actually at the table.
 */
export const removeMemberFromTable = async (
  payload: Payload,
  table: Table,
  memberId: string,
  memberName: string,
): Promise<RemoveMemberResult> => {
  const members = relationshipIds(table.members)
  const nextMembers = members.filter(id => id !== memberId)

  if (nextMembers.length === 0) {
    await payload.delete({
      collection: 'tables',
      id: table.id,
    })
    return { deleted: true }
  }

  const updateData: {
    members: string[]
    seatPositions: SeatRow[]
    owner?: string
  } = {
    members: nextMembers,
    seatPositions: removeMemberSeats(table.seatPositions, memberId, memberName),
  }

  // The owner is required, so hand ownership to the longest-standing member.
  if (relationshipId(table.owner) === memberId) {
    updateData.owner = nextMembers[0]
  }

  await payload.update({
    collection: 'tables',
    id: table.id,
    data: updateData,
  })

  return { deleted: false }
}
