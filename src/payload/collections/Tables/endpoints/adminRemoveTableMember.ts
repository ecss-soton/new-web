import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { accountDisplayName } from '../../../utilities/booking'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipIds } from '../../../utilities/relationships'
import { removeMemberFromTable } from '../../../utilities/tableMembers'
import { getTableByJoinCode } from './getTableByJoinCode'

/**
 * Admin-only removal of a guest from a table. The guest's seat and plus-one seats
 * are cleared, ownership transfers if they owned the table, and the table is
 * deleted if it was their last member.
 */
export const adminRemoveTableMember: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user || !isAdmin(user)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const { userId } = (req.body || {}) as { userId?: unknown }

  if (typeof userId !== 'string' || userId.length === 0) {
    return res.status(400).json({ error: 'Missing "userId" field' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  return withKeyedLock(`table:${table.id}`, async () => {
    const current = await payload
      .findByID({
        collection: 'tables',
        id: table.id,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!current) {
      return res.status(404).json({ error: 'Table not found' })
    }

    if (!relationshipIds(current.members).includes(userId)) {
      return res.status(400).json({ error: 'That person is not at this table' })
    }

    // Only needed to clear legacy name-matched seat rows.
    const member = await payload
      .findByID({
        collection: 'users',
        id: userId,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)
    const memberName =
      accountDisplayName(member ?? undefined) || ((member?.username as string) ?? '')

    try {
      const { deleted } = await removeMemberFromTable(payload, current, userId, memberName)
      return res.json({ success: true, tableDeleted: deleted })
    } catch (err: unknown) {
      // Custom endpoints have no async rejection guard — respond rather than throw.
      const message = err instanceof Error ? err.message : 'Unable to remove that guest'
      return res.status(400).json({ error: message })
    }
  })
}
