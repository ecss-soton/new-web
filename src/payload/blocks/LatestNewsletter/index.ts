import type { Block } from 'payload/types'

export const LatestNewsletter: Block = {
  slug: 'latestNewsletter',
  labels: {
    singular: 'Latest Newsletter',
    plural: 'Latest Newsletters',
  },
  fields: [
    {
      name: 'subheading',
      type: 'text',
      label: 'Subheading',
      defaultValue: 'Latest Newsletter',
    },
    {
      name: 'linkText',
      type: 'text',
      label: 'Link Text',
      defaultValue: 'Read the latest issue →',
    },
  ],
}
