import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'

const Committee: CollectionConfig = {
  slug: 'committee',
  access: {
    read: () => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'type'],
  },
  fields: [
    {
      name: 'id',
      label: 'id',
      type: 'text',
      required: true,
    },
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: true,
    },
    {
      name: 'position',
      label: 'Position',
      type: 'select',
      options: [
        'Academic Secretary',
        'Events Officer',
        'Gamesmaster',
        'Games Officer',
        'Hackathon Officer',
        'Industry Officer',
        'International Representative',
        'Marketing Officer',
        'Masters Rep',
        'Postgraduate Representative',
        'President',
        'Publicity Officer',
        'Secretary',
        'Social Secretary',
        'Sports Officer',
        'Sports Representative',
        'Staff Representative',
        'Treasurer',
        'Unknown Role',
        'Vice President',
        'Vice President Engagement',
        'Vice President Operations',
        'Webmaster',
        'Web Officer',
        'Welfare Officer',
        "Women's Representative",
      ],
    },
    {
      name: 'bio',
      label: 'Bio',
      type: 'richText',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}

export default Committee
