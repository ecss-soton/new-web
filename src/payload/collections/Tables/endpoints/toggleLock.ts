import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { relationshipId } from '../../../utilities/relationships'
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

  // The lock is the table owner's freeze control, so it is independent of
  // whether event booking is open: an owner can freeze the table after close.
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

    const isOwner = relationshipId(current.owner) === user.id

    if (!isOwner && !isAdmin(user)) {
      return res.status(403).json({ error: 'Only the table owner can lock/unlock this table' })
    }

    const newLocked = !current.locked

    try {
      await payload.update({
        collection: 'tables',
        id: current.id,
        data: {
          locked: newLocked,
        },
      })
    } catch (err: unknown) {
      // Custom endpoints have no async rejection guard — respond rather than throw.
      const message = err instanceof Error ? err.message : 'Unable to change the lock'
      return res.status(400).json({ error: message })
    }

    return res.json({ success: true, locked: newLocked })
  })
}
