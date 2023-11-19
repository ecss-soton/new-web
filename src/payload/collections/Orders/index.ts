import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';
import { admins } from '../../access/admins';
import { isAnInt } from '../../validate/isAnInt';
import { updatePrice } from './hooks/updatePrice';
import { onlyOneBasket } from './access/onlyOneBasket';
import { userOrAdmin } from '../../access/userOrAdmin';
import { isBasket } from './access/isBasket';
import { atLeastOneItem } from './validate/atLeastOneItem';
import { pay } from './endpoints/pay';

// TODO: Check if sale active before checkout
const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    read: userOrAdmin,
    create: onlyOneBasket,
    update: isBasket,
    delete: admins,
  },
  hooks: {
    beforeChange: [updatePrice],
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
      filterOptions: ({ user }) => {
        if (user) {
          return {
            user: {
              equals: user.id,
            },
          };
        }
        return {
          user: {
            not_equals: undefined,
          },
        };
      },
    },
    {
      name: 'merch',
      type: 'relationship',
      relationTo: 'orderedMerch',
      hasMany: true,
      validate: atLeastOneItem,
      filterOptions: ({ user }) => {
        if (user) {
          return {
            user: {
              equals: user.id,
            },
          };
        }
        return {
          user: {
            not_equals: undefined,
          },
        };
      },
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
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'stripeTax',
      label: 'Stripe Tax (in pence)',
      type: 'number',
      min: 0,
      validate: isAnInt,
      admin: {
        readOnly: true,
        description: 'The stripe tax in pence of the order.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'quickfileID',
      label: 'Quickfile ID',
      type: 'number',
      validate: isAnInt,
      admin: {
        readOnly: true,
        description: 'The quickfile invoice ID.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'stripeID',
      label: 'Stripe ID',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'The stripe checkout ID.',
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
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'forceUpdate',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      admin: {
        description: 'Used to force update the price.',
      },
      access: {
        read: admins,
        update: admins,
        create: () => false,
      },
    },
  ],
  endpoints: [
    {
      path: '/:id/pay/:method',
      method: 'post',
      handler: pay,
    },
  ],
};

export default Orders;
