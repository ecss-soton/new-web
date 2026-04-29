import type { AccessArgs } from 'payload/config'

import type { User } from '../payload-types'
import { isAdmin } from './isAdmin'

type isAdminCheck = (args: AccessArgs<unknown, User>) => boolean

export const admins: isAdminCheck = ({ req: { user } }) => {
  return isAdmin(user)
}
