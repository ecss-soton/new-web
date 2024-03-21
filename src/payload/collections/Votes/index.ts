import type { CollectionConfig } from 'payload/types'

import { user } from '../../access/user'
import { getID } from '../../utilities/getID'
import Groups from '../groups'
import { hasVoted } from './endpoints/hasVoted'
import { validateCorrectElectionTime } from './validate/validateCorrectElectionTime'
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
  endpoints: [
    {
      method: 'get',
      handler: hasVoted,
      path: '/:electionId/:positionId/hasVoted',
    },
  ],
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
      validate: validateCorrectElectionTime,
      filterOptions: ({ data }) => ({
        positions: {
          contains: data.position,
        },
      }),
    },
    {
      name: 'RONPosition',
      type: 'number',
      validate: validateRONPosition,
      min: 0,
    },
    {
      name: 'preference',
      type: 'relationship',
      relationTo: 'nominations',
      hasMany: true,
      defaultValue: () => [],
      validate: validatePreferences,
      filterOptions: ({ data }) => ({
        election: { equals: getID(data.election) },
        position: { equals: getID(data.position) },
      }),
    },
  ],
}

export default Votes
