import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { anyone } from '../../access/anyone'
import { isAdmin } from '../../access/isAdmin'
import adminsAndUser from './access/adminsAndUser'
import { countSusuMembers } from './endpoints/countSusuMembers'
import { checkSusuRoleAfterCreate } from './hooks/checkSusuRoleAfterCreate'
import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin'
import { loginAfterCreate } from './hooks/loginAfterCreate'

const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email'],
  },
  access: {
    read: adminsAndUser,
    create: anyone,
    update: adminsAndUser,
    delete: admins,
    admin: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    afterChange: [loginAfterCreate, checkSusuRoleAfterCreate],
  },
  auth: {
    disableLocalStrategy: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'username',
      type: 'text',
      admin: { readOnly: true },
      access: { update: admins },
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
        {
          label: 'susu',
          value: 'susu',
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
    {
      name: 'interestedEvents',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  endpoints: [
    {
      path: '/count-susu-members',
      method: 'get',
      handler: countSusuMembers,
    },
  ],
  timestamps: true,
}

export default Users
