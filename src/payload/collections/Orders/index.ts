import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';
import { admins } from '../../access/admins';
import { isAnInt } from '../../validate/isAnInt';
import { updatePrice } from './hooks/updatePrice';
import { onlyOneBasket } from './access/onlyOneBasket';
import { userOrAdmin } from '../../access/userOrAdmin';
import { isBasket } from './access/isBasket';
import { atLeastOneItem } from './validate/atLeastOneItem';

// TODO: Check if sale active before checkout
const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    read: userOrAdmin,
    create: onlyOneBasket,
    update: isBasket,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Commerce,
    defaultColumns: ['user', 'price', 'status'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }) => user.id,
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'tickets',
      type: 'relationship',
      relationTo: 'orderedTickets',
      hasMany: true,
      filterOptions: ({ user }) => ({
        user: {
          equals: user.id,
        },
      }),
    },
    {
      name: 'merch',
      type: 'relationship',
      relationTo: 'orderedMerch',
      hasMany: true,
      validate: atLeastOneItem,
      filterOptions: ({ user }) => ({
        user: {
          equals: user.id,
        },
      }),
    },
    {
      name: 'price',
      label: 'Price (in pence)',
      type: 'number',
      min: 0,
      validate: isAnInt,
      admin: {
        readOnly: true,
        description: 'The price in pence of the order.',
      },
      hooks: {
        beforeChange: [updatePrice],
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'basket',
      options: ['basket', 'pending', 'failed', 'completed'],
      hasMany: false,
      access: {
        create: admins,
        update: admins,
      },
    },
  ],
};

export default Orders;
