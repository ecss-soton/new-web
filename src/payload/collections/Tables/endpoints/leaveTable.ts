import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipId, relationshipIds } from '../../../utilities/relationships'
import { getTableByJoinCode } from './getTableByJoinCode'

interface SeatPosition {
  seatIndex: number
  userId?: string | null
  name: string
}

/**
 * Drops the seats belonging to a departing member. New rows are keyed by
 * `userId`; rows written before that field existed only carry a display name, so
 * those fall back to a name match (ambiguous when two members share a name —
 * they are rewritten with a `userId` on the next seat save).
 */
const removeMemberSeats = (
  seatPositions: unknown,
  userId: string,
  userName: string,
): SeatPosition[] => {
  if (!Array.isArray(seatPositions)) return []

  return (seatPositions as SeatPosition[]).filter(seat => {
    const seatUserId = relationshipId(seat?.userId)
    if (seatUserId) return seatUserId !== userId
    return !userName || seat?.name !== userName
  })
}

export const leaveTable: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
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

    // Closing booking stops new tables and new joins; it must not trap existing
    // members. The owner's lock is the freeze control.
    if (current.locked && !admin) {
      return res
        .status(403)
        .json({ error: 'This table is locked. Ask the table owner to unlock it first.' })
    }

    const members = relationshipIds(current.members)

    if (!members.includes(user.id)) {
      return res.status(400).json({ error: 'You are not a member of this table' })
    }

    const nextMembers = members.filter(id => id !== user.id)

    try {
      if (nextMembers.length === 0) {
        await payload.delete({
          collection: 'tables',
          id: current.id,
        })
        return res.json({ success: true })
      }

      const nextSeats = removeMemberSeats(
        current.seatPositions,
        user.id,
        (user.name as string) || (user.username as string) || '',
      )

      const updateData: Record<string, unknown> = {
        members: nextMembers,
        seatPositions: nextSeats,
      }

      // The owner is required, so hand ownership to the longest-standing member.
      if (relationshipId(current.owner) === user.id) {
        updateData.owner = nextMembers[0]
      }

      await payload.update({
        collection: 'tables',
        id: current.id,
        data: updateData,
      })
    } catch (err: unknown) {
      // Custom endpoints have no async rejection guard — respond rather than throw.
      const message = err instanceof Error ? err.message : 'Unable to leave this table'
      return res.status(400).json({ error: message })
    }

    return res.json({ success: true })
  })
}
