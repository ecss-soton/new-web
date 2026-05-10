import type { Block } from 'payload/types'

import richText from '../../fields/richText'

export const Intro: Block = {
  slug: 'intro',
  labels: {
    singular: 'Intro',
    plural: 'Intros',
  },
  fields: [
    richText({
      name: 'content',
      label: 'Content',
      required: true,
    }),
    {
      name: 'media',
      label: 'Media',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'quickLinks',
      label: 'Quick Links',
      type: 'array',
      minRows: 0,
      maxRows: 8,
      labels: {
        singular: 'Link',
        plural: 'Links',
      },
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          label: 'URL',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
