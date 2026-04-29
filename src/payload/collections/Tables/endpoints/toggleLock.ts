import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { getTableByJoinCode } from './getTableByJoinCode'

export const toggleLock: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const isOwner =
    typeof table.owner === 'string'
      ? table.owner === user.id
      : (table.owner as { id: string })?.id === user.id

  if (!isOwner && !isAdmin(user)) {
    return res.status(403).json({ error: 'Only the table owner can lock/unlock this table' })
  }

  const newLocked = !table.locked

  await payload.update({
    collection: 'tables',
    id: table.id,
    data: {
      locked: newLocked,
    },
  })

  return res.json({ success: true, locked: newLocked })
}
