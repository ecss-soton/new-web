import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';
import { admins } from '../../access/admins';
import { isAnInt } from '../../validate/isAnInt';
import { updatePrice } from './hooks/updatePrice';
import { onlyOneBasket } from './access/onlyOneBasket';
import { userOrAdmin } from '../../access/userOrAdmin';
import { isBasket } from './access/isBasket';

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
      name: 'items',
      type: 'relationship',
      relationTo: ['orderedMerch', 'orderedTickets'],
      required: true,
      hasMany: true,
      minRows: 1,
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
      min: 1,
      validate: isAnInt,
      admin: {
        condition: (data) => data.price === 0 || typeof data === 'undefined',
        description: 'The price in pence of the order.',
      },
      hooks: {
        beforeChange: [updatePrice],
      },
      access: {
        create: admins,
        update: admins,
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
