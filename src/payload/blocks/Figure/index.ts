import type { Block } from 'payload/types'

import { spanField } from '../../fields/span'

export const Figure: Block = {
  slug: 'figure',
  labels: {
    singular: 'Figure',
    plural: 'Figures',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      type: 'textarea',
    },
    spanField('figureSpan'),
  ],
}
