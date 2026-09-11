import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { user } from '../../access/user'
import type { User } from '../../payload-types'
import { guess as guessHandler } from './endpoints/guess'
import { leaderboard } from './endpoints/leaderboard'
import { saveScore } from './endpoints/saveScore'
import { stats } from './endpoints/stats'
import { updateDisplayName } from './endpoints/updateDisplayName'

const WordleScores: CollectionConfig = {
  slug: 'wordle-scores',
  access: {
    // Anonymous users see nothing; authenticated users see only their own scores; admins see all.
    read: ({ req: { user: reqUser } }) => {
      if (!reqUser) return false
      if ((reqUser as User).roles?.includes('admin')) return true
      return { user: { equals: reqUser.id } }
    },
    create: user,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'date', 'solved', 'guesses'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      type: 'text',
      required: true,
    },
    {
      name: 'solved',
      type: 'checkbox',
      required: true,
    },
    {
      name: 'guesses',
      type: 'number',
      required: true,
      min: 0,
      max: 6,
    },
    {
      name: 'attempts',
      type: 'array',
      fields: [
        {
          name: 'guess',
          type: 'text',
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/guess',
      method: 'post',
      handler: guessHandler,
    },
    {
      path: '/save',
      method: 'post',
      handler: saveScore,
    },
    {
      path: '/stats/:userId',
      method: 'get',
      handler: stats,
    },
    {
      path: '/leaderboard',
      method: 'get',
      handler: leaderboard,
    },
    {
      path: '/update-display-name',
      method: 'post',
      handler: updateDisplayName,
    },
  ],
}

export default WordleScores
