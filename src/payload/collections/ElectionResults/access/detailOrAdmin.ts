import type { FieldAccess } from 'payload/types'

import { isAdmin } from '../../../access/isAdmin'
import type { ElectionResult } from '../../../payload-types'

/**
 * Detailed result data (rounds, ballot file, transcript) is only exposed to
 * non-admins when the result is enabled for the main election page. The winner
 * summary (`electedNominee`) remains readable either way.
 */
export const detailOrAdmin: FieldAccess<ElectionResult> = ({ req: { user }, doc }) =>
  isAdmin(user) || Boolean(doc?.showOnMainPage)
