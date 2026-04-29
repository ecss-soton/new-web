import type { Access, FieldAccess } from 'payload/types'

import { isAdmin } from '../../../access/isAdmin'

export const nominee: FieldAccess = ({ req: { user }, data }) => {
  if (user?.id && data?.nominees) {
    return data.nominees.includes(user.id)
  }

  return false
}

export const adminOrNominee: Access = async ({ req: { user } }) => {
  if (isAdmin(user)) {
    return true
  }

  if (!user?.id) {
    return false
  }

  return {
    nominees: {
      contains: user.id,
    },
  }
}
