import type { Access } from 'payload/config'

import type { Sale } from '../../../payload-types'
import { checkRole } from '../../Users/checkRole'

export const saleActiveOrAdmin: Access<Sale> = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  return {
    saleStart: {
      less_than_equal: new Date().toISOString(),
    },
  }
}
