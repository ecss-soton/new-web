import type { Block } from 'payload/types'

import link from '../../fields/link'

export const SummerPartyBlock: Block = {
  slug: 'summerPartyBlock',
  labels: {
    singular: 'Summer Party Block',
    plural: 'Summer Party Blocks',
  },
  fields: [
    {
      name: 'heroTitle',
      type: 'text',
      required: true,
      defaultValue: 'See you on the 5th of June at 7pm!',
    },
    {
      name: 'heroText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'buttons',
      type: 'array',
      maxRows: 3,
      fields: [
        link({
          appearances: ['primary', 'secondary'],
        }),
      ],
    },
    {
      name: 'bigImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'squareImages',
      type: 'array',
      maxRows: 3,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'venueBlock',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', required: true, defaultValue: 'The Venue' },
        { name: 'text', type: 'textarea', required: true },
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
      ],
    },
    {
      name: 'menuBlock',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', required: true, defaultValue: 'The Menu' },
        { name: 'text', type: 'textarea', required: true },
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
      ],
    },
    {
      name: 'questionsBlock',
      type: 'group',
      fields: [
        { name: 'text', type: 'text', required: true, defaultValue: 'Questions about allergies?' },
        link({
          appearances: ['primary', 'secondary'],
        }),
      ],
    },
    {
      name: 'onTheDayBlock',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', required: true, defaultValue: 'On the Day' },
        { name: 'text', type: 'textarea', required: true },
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
      ],
    },
    {
      name: 'faqs',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    {
      name: 'organisers',
      type: 'array',
      fields: [{ name: 'logo', type: 'upload', relationTo: 'media', required: true }],
    },
  ],
}
