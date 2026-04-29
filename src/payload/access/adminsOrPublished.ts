import type { Access } from 'payload/config'

import { isAdmin } from './isAdmin'

export const adminsOrPublished: Access = ({ req: { user } }) => {
  if (isAdmin(user)) {
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
