import type { CollectionConfig } from 'payload/types'

import Groups from '../groups'

const Votes: CollectionConfig = {
  slug: 'votes',
  access: {
    read: (): boolean => false,
  },
  admin: {
    group: Groups.Elections,
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
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
    },
    {
      name: 'preference',
      type: 'relationship',
      required: true,
      relationTo: 'nominations',
      hasMany: true,
    },
  ],
}

export default Votes
