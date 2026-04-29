import type { Access } from 'payload/config'

import type { User } from '../payload-types'
import { isAdmin } from './isAdmin'

export const userOrAdmin: Access<{ user: string | User }> = ({ req: { user } }) => {
  if (!user) {
    return false
  }

  if (isAdmin(user)) {
    return true
  }

  return {
    user: {
      equals: user.id,
    },
  }
}
