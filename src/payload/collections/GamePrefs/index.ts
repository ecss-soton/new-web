import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import type { User } from '../../payload-types'
import { getPreference, setPreference } from './endpoints/me'

const GamePrefs: CollectionConfig = {
  slug: 'game-prefs',
  access: {
    // Preference is written through /me so users can only change their own.
    read: ({ req: { user: reqUser } }) => {
      if (!reqUser) return false
      if ((reqUser as User).roles?.includes('admin')) return true
      return { user: { equals: reqUser.id } }
    },
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'entryKey',
    defaultColumns: ['game', 'user', 'hidden'],
  },
  fields: [
    {
      name: 'entryKey',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'userId:game — one preference per user per game.',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'game',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'hidden',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      admin: {
        description: 'Hide this player from the game leaderboard. Scores are still recorded.',
      },
    },
  ],
  endpoints: [
    {
      path: '/me',
      method: 'get',
      handler: getPreference,
    },
    {
      path: '/me',
      method: 'post',
      handler: setPreference,
    },
  ],
}

export default GamePrefs
