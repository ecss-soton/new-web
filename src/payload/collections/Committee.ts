import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { isHTTPS } from '../validate/isHTTPS'

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
    defaultColumns: ['id', 'isCurrent'],
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
      label: 'Custom Position',
      type: 'select',
      required: false,
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
      name: 'positionRef',
      label: 'Position',
      type: 'relationship',
      relationTo: 'positions',
      required: true,
      hasMany: false,
      admin: {
        allowCreate: true,
      },
    },
    {
      name: 'bio',
      label: 'Bio',
      type: 'richText',
      admin: {
        description:
          'Shown in a popup when the card is clicked. If set, this takes priority over the Link field.',
      },
    },
    {
      name: 'link',
      label: 'Link',
      type: 'text',
      validate: isHTTPS,
      admin: {
        description:
          'Optional HTTPS URL. Used when Bio is empty: clicking the card opens this link in a new tab.',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'isCurrent',
      type: 'checkbox',
      label: 'Is in current committee?',
      required: true,
    },
  ],
}

export default Committee
