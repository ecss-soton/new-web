import type { Access } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import type { ElectionResult } from '../../../payload-types'

export const publishedOrAdmin: Access<ElectionResult> = ({ req: { user } }) => {
  if (isAdmin(user)) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
