import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { getTableByJoinCode } from './getTableByJoinCode'

/**
 * Admin-only deletion of a table and its seating. User accounts are untouched;
 * members simply stop having a table on their next load.
 */
export const adminDeleteTable: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user || !isAdmin(user)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  return withKeyedLock(`table:${table.id}`, async () => {
    // Re-read under the lock so a delete cannot race a join, leave or seat save.
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

    try {
      await payload.delete({
        collection: 'tables',
        id: current.id,
      })
    } catch (err: unknown) {
      // Custom endpoints have no async rejection guard — respond rather than throw.
      const message = err instanceof Error ? err.message : 'Unable to delete this table'
      return res.status(400).json({ error: message })
    }

    return res.json({ success: true })
  })
}
