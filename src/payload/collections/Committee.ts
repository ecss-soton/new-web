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
        'President',
        'Vice President',
        'Vice President Engagement',
        'Vice President Operations',
        'Secretary',
        'Treasurer',
        'Events Officer',
        'Welfare Officer',
        'Web Officer',
        'Social Secretary',
        'Sports Officer',
        'Marketing Officer',
        'Hackathon Officer',
        'Industry Officer',
        'Academic Secretary',
        'Gamesmaster',
        'Games Officer',
        'International Representative',
        'Masters Rep',
        'Postgraduate Representative',
        'Publicity Officer',
        'Sports Representative',
        'Staff Representative',
        'Unknown Role',
        'Webmaster',
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
