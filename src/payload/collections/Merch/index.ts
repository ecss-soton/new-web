import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { anyone } from '../../access/anyone'
import Groups from '../groups'

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
    read: anyone,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.Commerce,
    defaultColumns: ['title', 'id', 'link'],
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'e.g. simple-tshirt',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'colours',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: {
            description: 'Upload the image here. All media should be put into /media/merch/',
          },
        },
      ],
    },
    {
      name: 'link',
      type: 'text',
      required: true,
      admin: {
        description: 'Link to BoxOffice (e.g. https://boxoffice.susu.org/...)',
      },
    },
  ],
}

export default Merch
