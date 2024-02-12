import type { Access } from 'payload/config'

import type { User } from '../../../payload-types'
import { checkRole } from '../../Users/checkRole'

export const isBasket: Access<{ user: string | User }> = ({ req: { user } }) => {
  if (!user) {
    return false
  }

  if (checkRole(['admin'], user)) {
    return true
  }

  return {
    and: [
      {
        user: {
          equals: user.id,
        },
      },
      {
        status: {
          equals: 'basket',
        },
      },
    ],
  }
}
