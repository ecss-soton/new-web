import type { CollectionConfig } from 'payload/types';

import { admins } from '../../access/admins';
import adminsAndUser from './access/adminsAndUser';
import { checkRole } from './checkRole';
import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin';
import { loginAfterCreate } from './hooks/loginAfterCreate';
import { isAnInt } from '../../validate/isAnInt';

const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'username', 'email'],
  },
  access: {
    read: adminsAndUser,
    create: () => true,
    update: adminsAndUser,
    delete: admins,
    admin: ({ req: { user } }) => checkRole(['admin'], user),
  },
  hooks: {
    afterChange: [loginAfterCreate],
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'username',
      type: 'text',
      required: true,
      access: {
        update: admins,
        create: admins,
      },
    },
    {
      name: 'quickfileClientID',
      label: 'Quickfile Client ID',
      type: 'number',
      validate: isAnInt,
      access: {
        read: admins,
        update: admins,
        create: admins,
      },
    },
    {
      name: 'stripeClientID',
      label: 'Stripe Client ID',
      type: 'text',
      access: {
        read: admins,
        update: admins,
        create: admins,
      },
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['user'],
      options: [
        {
          label: 'admin',
          value: 'admin',
        },
        {
          label: 'user',
          value: 'user',
        },
      ],
      hooks: {
        beforeChange: [ensureFirstUserIsAdmin],
      },
      access: {
        read: admins,
        create: admins,
        update: admins,
      },
    },
  ],
  timestamps: true,
};

export default Users;
