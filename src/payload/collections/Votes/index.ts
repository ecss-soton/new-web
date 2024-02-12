import type { CollectionConfig } from 'payload/types'

import { user } from '../../access/user'
import Groups from '../groups'
import { validatePreferences } from './validate/validatePreferences'
import { validateRONPosition } from './validate/validateRONPosition'
import { voteIsUnique } from './validate/voteIsUnique'

const Votes: CollectionConfig = {
  slug: 'votes',
  access: {
    read: () => false,
    update: () => false,
    delete: () => false,
    create: user,
  },
  admin: {
    group: Groups.Elections,
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      access: {
        create: () => false,
      },
      defaultValue: ({ user: u }) => u.username,
      validate: voteIsUnique,
    },
    {
      name: 'position',
      type: 'relationship',
      required: true,
      relationTo: 'positions',
      hasMany: false,
    },
    {
      name: 'election',
      type: 'relationship',
      required: true,
      relationTo: 'elections',
      hasMany: false,
      filterOptions: ({ data }) => ({
        and: [
          {
            positions: {
              contains: data.position,
            },
          },
          {
            votingStart: {
              less_than_equal: new Date().toISOString(),
            },
          },
          {
            votingEnd: {
              greater_than_equal: new Date().toISOString(),
            },
          },
        ],
      }),
    },
    {
      name: 'RONPosition',
      type: 'number',
      required: true,
      validate: validateRONPosition,
      min: 0,
    },
    {
      name: 'preference',
      type: 'relationship',
      required: true,
      relationTo: 'nominations',
      hasMany: true,
      minRows: 1,
      validate: validatePreferences,
    },
  ],
}

export default Votes
