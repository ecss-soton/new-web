import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { anyone } from '../../access/anyone'
import { user } from '../../access/user'
import { leaderboard } from './endpoints/leaderboard'
import { saveScore } from './endpoints/saveScore'
import { stats } from './endpoints/stats'
import { updateDisplayName } from './endpoints/updateDisplayName'

const WordleScores: CollectionConfig = {
  slug: 'wordle-scores',
  access: {
    read: anyone,
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
