import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { testMatchesRegex } from '../validate/isAnInt'

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
      label: 'Year (Start-End)',
      type: 'text',
      required: true,
      validate: testMatchesRegex(/^\d{4}-\d{4}$/),
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: ['old', 'current'],
    },
    {
      name: 'members',
      label: 'Committee Members',
      type: 'relationship',
      hasMany: true,
      relationTo: ['nominations', 'positions'],
      admin: {
        condition: data => {
          return data?.type === 'current'
        },
        description: 'If a position is unfilled add it as a position instead of a nomination',
      },
    },
    {
      name: 'simplifiedMembers',
      label: 'Simplified Members',
      type: 'array',
      admin: {
        condition: data => {
          return data?.type === 'old'
        },
      },
      fields: [
        {
          name: 'position',
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
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}

export default Committee
