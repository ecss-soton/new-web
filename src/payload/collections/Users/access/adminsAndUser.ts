import type { Access } from 'payload/types'

import { isAdmin } from '../../../access/isAdmin'

const adminsAndUser: Access = ({ req: { user } }) => {
  if (user) {
    if (isAdmin(user)) {
      return true
    }

    return {
      id: {
        equals: user.id,
      },
    }
  }

  return false
}

export default adminsAndUser
