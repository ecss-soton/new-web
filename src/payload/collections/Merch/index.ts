import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { saleActiveOrAdmin } from '../../access/saleActiveOrAdmin'
import { isAnInt } from '../../validate/isAnInt'
import Groups from '../groups'
import { uniqueFields } from './validate/uniqueFields'

const Merch: CollectionConfig = {
  slug: 'merch',
  graphQL: {
    singularName: 'merch',
    pluralName: 'merch',
  },
  labels: {
    singular: 'Merch',
    plural: 'Merch',
  },
  access: {
    read: saleActiveOrAdmin,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Commerce,
    defaultColumns: ['name', 'sale', 'description'],
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
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'sizes',
      type: 'array',
      validate: uniqueFields(
        d => d?.sizes,
        s => s?.size,
        true,
      ),
      fields: [
        {
          name: 'size',
          type: 'text',
          required: true,
        },
      ],
      defaultValue: [{ size: 'small' }, { size: 'medium' }, { size: 'large' }],
    },
    {
      name: 'colours',
      type: 'array',
      validate: uniqueFields(
        d => d?.colours,
        c => c?.colour,
        true,
      ),
      fields: [
        {
          name: 'colour',
          type: 'text',
          required: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'hexValue',
          type: 'text',
        },
      ],
    },
    {
      name: 'variations',
      type: 'array',
      required: true,
      validate: uniqueFields(
        d => d?.variations,
        v => v?.variation,
        false,
      ),
      fields: [
        {
          name: 'variation',
          type: 'text',
          required: true,
          defaultValue: 'main',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
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
    },
  ],
}

export default Merch
