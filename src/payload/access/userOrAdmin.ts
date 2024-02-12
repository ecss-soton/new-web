import type { Access } from 'payload/config'

import { checkRole } from '../collections/Users/checkRole'
import type { User } from '../payload-types'

export const userOrAdmin: Access<{ user: string | User }> = ({ req: { user } }) => {
  if (!user) {
    return false
  }

  if (checkRole(['admin'], user)) {
    return true
  }

  return {
    user: {
      equals: user.id,
    },
  }
}
