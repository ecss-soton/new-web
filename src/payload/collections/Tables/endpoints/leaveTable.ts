import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipIds } from '../../../utilities/relationships'
import { removeMemberFromTable } from '../../../utilities/tableMembers'
import { getTableByJoinCode } from './getTableByJoinCode'

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

    // Closing booking stops new tables and new joins; it must not trap existing
    // members. The owner's lock is the freeze control.
    if (current.locked && !isAdmin(user)) {
      return res
        .status(403)
        .json({ error: 'This table is locked. Ask the table owner to unlock it first.' })
    }

    const members = relationshipIds(current.members)

    if (!members.includes(user.id)) {
      return res.status(400).json({ error: 'You are not a member of this table' })
    }

    try {
      await removeMemberFromTable(
        payload,
        current,
        user.id,
        (user.name as string) || (user.username as string) || '',
      )
    } catch (err: unknown) {
      // Custom endpoints have no async rejection guard — respond rather than throw.
      const message = err instanceof Error ? err.message : 'Unable to leave this table'
      return res.status(400).json({ error: message })
    }

    return res.json({ success: true })
  })
}
