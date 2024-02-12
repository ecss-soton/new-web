import type { Access } from 'payload/config'

import type { ElectionResult } from '../../../payload-types'
import { checkRole } from '../../Users/checkRole'

export const publishedOrAdmin: Access<ElectionResult> = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
