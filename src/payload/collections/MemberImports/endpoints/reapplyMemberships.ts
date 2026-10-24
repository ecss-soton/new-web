import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { applyStoredMemberships } from '../../../utilities/susuMembers'

const SUSU_MEMBER_LOCK = 'susu-members'

/**
 * Admin recovery action: re-run matching for every account against the stored
 * SUSU members. Useful after deploying a matching fix, after a manual member
 * correction, or if a first login happened before the members were imported.
 */
export const reapplyMemberships: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!isAdmin(user)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const work = (): ReturnType<typeof applyStoredMemberships> =>
      applyStoredMemberships({ payload, role: 'susu' })
    const result = await withKeyedLock(SUSU_MEMBER_LOCK, work)

    payload.logger.info(
      `Re-applied SUSU memberships: ${result.members} active members against ${result.users} accounts; ${result.rolesAdded} new roles.`,
    )

    res.json({ success: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(`Failed to re-apply SUSU memberships: ${message}`)

    res.status(503).json({ error: message })
  }
}
