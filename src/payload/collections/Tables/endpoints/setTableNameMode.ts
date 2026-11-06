import type { PayloadHandler } from 'payload/config'

import {
  normalizeTableNameMode,
  TABLE_NAME_MODES,
  tableDisplayName,
  type TableNameMode,
} from '../../../../utilities/booking/tableName'
import { isAdmin } from '../../../access/isAdmin'
import { relationshipId } from '../../../utilities/relationships'
import { getTableByJoinCode } from './getTableByJoinCode'

/**
 * The owner's naming switch on the seat plan. Only two options exist — their own
 * first name or the join code — and the choice is stored on the table so everyone
 * sees the same name. Allowed while locked or after booking closes (the lock
 * freezes the roster, not the label).
 */
export const setTableNameMode: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const { nameMode } = (req.body || {}) as { nameMode?: unknown }

  if (typeof nameMode !== 'string' || !TABLE_NAME_MODES.includes(nameMode as TableNameMode)) {
    return res.status(400).json({ error: 'Choose either the owner name or the join code' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const isOwner = relationshipId(table.owner) === user.id
  if (!isOwner && !isAdmin(user)) {
    return res
      .status(403)
      .json({ error: 'Only the table owner can change what this table is called' })
  }

  const mode = normalizeTableNameMode(nameMode)

  try {
    await payload.update({
      collection: 'tables',
      id: table.id,
      data: { nameMode: mode },
    })
  } catch (err: unknown) {
    // Custom endpoints have no async rejection guard — respond rather than throw.
    const message = err instanceof Error ? err.message : 'Unable to change the table name'
    return res.status(400).json({ error: message })
  }

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
      // Fall through to the join-code label.
    }
  }

  return res.json({
    success: true,
    nameMode: mode,
    name: tableDisplayName({
      nameMode: mode,
      joinCode: table.joinCode,
      ownerName,
      ownerUsername,
    }),
  })
}
