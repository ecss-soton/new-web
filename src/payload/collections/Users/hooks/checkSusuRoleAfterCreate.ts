import type { AfterChangeHook } from 'payload/dist/collections/config/types'

import { grantRoleIfSusuMember } from '../../../utilities/susuMembers'

/**
 * First Azure AD login. Matches against the durable `susu-members` collection,
 * so it keeps working after a redeploy/restart (the uploaded CSV may be gone) and
 * on any app instance.
 */
export const checkSusuRoleAfterCreate: AfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') {
    return doc
  }

  try {
    await grantRoleIfSusuMember({
      payload: req.payload,
      userDoc: doc,
      role: 'susu',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    req.payload.logger.error(`Failed to check SUSU membership for user '${doc.id}': ${message}`)
  }

  return doc
}
