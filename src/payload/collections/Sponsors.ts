import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import linkGroup from '../fields/linkGroup'
import { slugField } from '../fields/slug'
import { isHTTPS } from '../validate/isHTTPS'
import { checkRole } from './Users/checkRole'

const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  access: {
    read: ({ req: { user } }) => {
      if (checkRole(['admin'], user)) {
        return true
      } else {
        return { level: { exists: true } }
      }
    },
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'level'],
  },
  versions: {
    drafts: true,
  },
  fields: [
    slugField(),
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'level',
      label: 'Level',
      admin: {
        description: 'If not set the sponsor will not appear on the website',
      },
      type: 'select',
      options: ['gold', 'silver', 'bronze', '64bit', '32bit', '16bit'],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'websiteUrl',
      label: 'The main website URL',
      type: 'text',
      validate: isHTTPS,
    },
    linkGroup(),
  ],
}

export default Sponsors
