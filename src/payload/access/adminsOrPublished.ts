import type { Access } from 'payload/config'

import { checkRole } from '../collections/Users/checkRole'

export const adminsOrPublished: Access = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  return {
    or: [
      {
        _status: {
          equals: 'published',
        },
      },
      {
        _status: {
          exists: false,
        },
      },
    ],
  }
}
