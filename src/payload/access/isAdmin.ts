import { checkRole } from '../collections/Users/checkRole'
import type { User } from '../payload-types'

export const isAdmin = (user?: User | null): boolean => {
  return checkRole(['admin'], user)
}
