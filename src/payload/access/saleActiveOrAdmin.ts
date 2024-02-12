import type { Access } from 'payload/config'

import { checkRole } from '../collections/Users/checkRole'
import type { Merch } from '../payload-types'

export const saleActiveOrAdmin: Access<Merch> = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  return {
    'sale.saleStart': {
      less_than_equal: new Date().toISOString(),
    },
  }
}
