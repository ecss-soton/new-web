import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { isAnInt } from '../../validate/isAnInt'
import Groups from '../groups'
import { publishedOrAdmin } from './access/publishedOrAdmin'
import { recountVotes } from './endpoints/recountVotes'
import { RecountVotesLink } from './react/recountVotesLink'

// If nominee is `undef` assume RON.
export const ElectionResults: CollectionConfig = {
  slug: 'electionResults',
  access: {
    read: publishedOrAdmin,
    readVersions: admins,
    create: () => false,
    // Allow draft status to be updated.
    update: admins,
    delete: () => false,
  },
  admin: {
    group: Groups.Elections,
  },
  versions: {
    drafts: true,
  },
  endpoints: [
    {
      path: '/:id/recount',
      method: 'post',
      handler: recountVotes,
    },
  ],
  fields: [
    {
      name: 'reRunElection',
      type: 'ui',
      admin: {
        components: {
          Field: RecountVotesLink,
        },
      },
    },
    {
      name: 'election',
      type: 'relationship',
      relationTo: 'elections',
      required: true,
      access: {
        update: () => false,
      },
    },
    {
      name: 'position',
      type: 'relationship',
      relationTo: 'positions',
      required: true,
      access: {
        update: () => false,
      },
    },
    {
      name: 'electedNominee',
      type: 'relationship',
      relationTo: 'nominations',
      access: {
        update: () => false,
      },
    },
    {
      name: 'ballot',
      type: 'textarea',
      required: true,
      access: {
        update: () => false,
      },
    },
    {
      name: 'roundTranscript',
      type: 'textarea',
      required: true,
      access: {
        update: () => false,
      },
    },
    {
      name: 'rounds',
      type: 'array',
      minRows: 1,
      required: true,
      access: {
        update: () => false,
      },
      fields: [
        {
          name: 'outcome',
          type: 'select',
          options: ['Elect', 'Defeat'],
          required: true,
        },
        {
          name: 'nomination',
          type: 'relationship',
          relationTo: 'nominations',
        },
        {
          name: 'votes',
          type: 'array',
          required: true,
          minRows: 1,
          fields: [
            {
              name: 'count',
              type: 'number',
              required: true,
              validate: isAnInt,
              min: 0,
            },
            {
              name: 'nomination',
              type: 'relationship',
              relationTo: 'nominations',
            },
            {
              name: 'state',
              type: 'select',
              required: true,
              options: ['Elected', 'Hopeful', 'Defeated'],
            },
          ],
        },
      ],
    },
  ],
}
