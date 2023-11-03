import type { CollectionConfig } from 'payload/types';

import { admins } from '../../access/admins';
import Groups from '../groups';
import { uniqueFields } from './validate/uniqueFields';
import { isAnInt } from '../../validate/isAnInt';

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
    // TODO: Update to only allow non-admins to see the item if it is on sale
    read: (): boolean => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Commerce,
    defaultColumns: ['image', 'name', 'description'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'sale',
      // TODO: Change to relationship
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'sizes',
      type: 'array',
      validate: uniqueFields((d) => d?.sizes, (s) => s?.size, true),
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
      validate: uniqueFields((d) => d?.colours, (c) => c?.colour, true),
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
      validate: uniqueFields((d) => d?.variations, (v) => v?.variation, false),
      fields: [
        {
          name: 'variation',
          type: 'text',
          required: true,
          defaultValue: 'Main',
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
        },
        {
          name: 'form',
          // TODO: Change to relationship
          type: 'text',
        },
      ],
    },
  ],
};

export default Merch;
