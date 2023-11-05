import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';
import { admins } from '../../access/admins';
import { userOrAdmin } from '../../access/userOrAdmin';
import { includedForm } from './validate/includedForm';

const OrderedTickets: CollectionConfig = {
  slug: 'orderedTickets',
  access: {
    read: userOrAdmin,
    create: () => true,
    update: admins,
    delete: admins,
  },
  admin: {
    group: Groups.Commerce,
    defaultColumns: ['ticket', 'user', 'form'],
  },
  fields: [
    {
      name: 'ticket',
      type: 'relationship',
      relationTo: 'tickets',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }) => user.id,
      access: {
        create: admins,
      },
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'form-submissions',
      validate: includedForm,
    },
  ],
};

export default OrderedTickets;
