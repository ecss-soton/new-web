import type { Access } from 'payload/types'

import { checkRole } from '../../Users/checkRole'

export const isSusuMemberAccess: Access = ({ req: { user } }) => {
  if (!user) {
    return false
  }

  return checkRole(['susu'], user) || false
}
