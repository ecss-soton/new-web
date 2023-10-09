import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';
import { voteIsUnique } from './validate/voteIsUnique';

const Votes: CollectionConfig = {
  slug: 'votes',
  access: {
    read: () => false,
    update: () => false,
    delete: () => false,
    create: () => true,
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
      defaultValue: ({ user }) => user.username,
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
        positions: {
          contains: data.position,
        },
      }),
    },
    {
      // TODO: Validate preferences
      name: 'preference',
      type: 'relationship',
      required: true,
      relationTo: 'nominations',
      hasMany: true,
    },
  ],
};

export default Votes;
