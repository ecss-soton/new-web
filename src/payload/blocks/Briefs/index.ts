import type { Block } from 'payload/types'

import { spanField } from '../../fields/span'
import { isInternalOrHTTPS } from '../../validate/isInternalOrHTTPS'

export const Briefs: Block = {
  slug: 'briefs',
  labels: {
    singular: 'Briefs',
    plural: 'Briefs',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'In Brief',
      required: true,
    },
    {
      name: 'entries',
      type: 'array',
      minRows: 1,
      labels: {
        singular: 'Entry',
        plural: 'Entries',
      },
      fields: [
        {
          name: 'title',
          label: 'Title (optional)',
          type: 'text',
        },
        {
          name: 'text',
          type: 'textarea',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'url',
              label: 'URL',
              type: 'text',
              validate: isInternalOrHTTPS,
              admin: {
                width: '66%',
              },
            },
            {
              name: 'linkLabel',
              label: 'Link label',
              type: 'text',
              admin: {
                width: '33%',
              },
            },
          ],
        },
      ],
    },
    spanField('briefsSpan'),
  ],
}
