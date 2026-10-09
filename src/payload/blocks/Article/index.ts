import type { Block } from 'payload/types'

import richText from '../../fields/richText'
import { spanField } from '../../fields/span'

export const Article: Block = {
  slug: 'article',
  labels: {
    singular: 'Article',
    plural: 'Articles',
  },
  fields: [
    {
      name: 'headline',
      type: 'text',
      required: true,
    },
    {
      name: 'byline',
      type: 'text',
    },
    richText({ name: 'body', label: 'Body' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'imagePosition',
      type: 'select',
      defaultValue: 'top',
      options: [
        { label: 'Top', value: 'top' },
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
    spanField('articleSpan'),
    {
      name: 'featured',
      label: 'Featured (large headline)',
      type: 'checkbox',
    },
  ],
}
