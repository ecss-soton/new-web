import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { user } from '../../access/user'
import { userOrAdmin } from '../../access/userOrAdmin'
import Groups from '../groups'
import { includedForm } from './validate/includedForm'

const OrderedTickets: CollectionConfig = {
  slug: 'orderedTickets',
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
      defaultValue: ({ user: u }) => u.id,
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
}

export default OrderedTickets
