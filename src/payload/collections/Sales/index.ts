import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import Groups from '../groups'
import { isDateCorrect } from '../Merch/validate/isDateCorrect'
import { saleActiveOrAdmin } from './access/saleActiveOrAdmin'

const Merch: CollectionConfig = {
  slug: 'sales',
  access: {
    read: saleActiveOrAdmin,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Commerce,
    defaultColumns: ['name', 'saleStart', 'saleEnd'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'saleStart',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      required: true,
    },
    {
      name: 'saleEnd',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      validate: isDateCorrect,
      required: true,
    },
  ],
}

export default Merch
