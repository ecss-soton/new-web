import type { CollectionConfig } from 'payload/types';

import Groups from '../groups';
import { admins } from '../../access/admins';
import { userOrAdmin } from '../../access/userOrAdmin';
import { matchesMerch } from './validate/matchesMerch';
import { includedForm } from './validate/includedForm';
import { user } from '../../access/user';

const OrderedMerch: CollectionConfig = {
  slug: 'orderedMerch',
  graphQL: {
    singularName: 'orderedMerch',
    pluralName: 'orderedMerch',
  },
  labels: {
    singular: 'Ordered Merch',
    plural: 'Ordered Merch',
  },
  access: {
    read: userOrAdmin,
    create: user,
    update: admins,
    delete: admins,
  },
  admin: {
    group: Groups.Commerce,
    defaultColumns: ['ticket', 'user', 'form'],
  },
  fields: [
    {
      name: 'merch',
      type: 'relationship',
      relationTo: 'merch',
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
      name: 'size',
      type: 'text',
      validate: matchesMerch((d) => d?.sizes, (s) => s?.size),
    },
    {
      name: 'colour',
      type: 'text',
      validate: matchesMerch((d) => d?.colours, (c) => c?.colour),
    },
    {
      name: 'variation',
      type: 'text',
      required: true,
      defaultValue: 'main',
      validate: matchesMerch((d) => d?.variations, (v) => v?.variation),
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'form-submissions',
      validate: includedForm,
    },
  ],
};

export default OrderedMerch;
