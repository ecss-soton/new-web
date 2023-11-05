import type { CollectionConfig } from 'payload/types';

import Groups from './groups';
import { admins } from '../access/admins';
import { saleActiveOrAdmin } from '../access/saleActiveOrAdmin';
import { isAnInt } from '../validate/isAnInt';

const Tickets: CollectionConfig = {
  slug: 'tickets',
  access: {
    read: saleActiveOrAdmin,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Commerce,
    defaultColumns: ['name', 'sale', 'price'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'sale',
      type: 'relationship',
      relationTo: 'sales',
      required: true,
    },
    // TODO: Add a relationship to an event once events exist.
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'count',
      type: 'number',
      min: 1,
      validate: isAnInt,
      admin: {
        description: 'The amount of tickets available.',
      },
    },
    {
      name: 'price',
      label: 'Price (in pence)',
      type: 'number',
      min: 1,
      validate: isAnInt,
      required: true,
      admin: {
        description: 'e.g. £23.52 should be 2352',
      },
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
    },
  ],
};

export default Tickets;
