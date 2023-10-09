import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';

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
      // TODO: Validate users cannot vote multiple times
      name: 'username',
      type: 'text',
      required: true,
      access: {
        create: () => false,
      },
      defaultValue: ({ user }) => user.username,
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
