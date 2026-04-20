import type { Block } from 'payload/types'

export const MerchBlock: Block = {
  slug: 'merchBlock',
  labels: {
    singular: 'Merch Block',
    plural: 'Merch Blocks',
  },
  fields: [
    {
      name: 'heroTitle',
      type: 'text',
      required: true,
      defaultValue: 'ECSS Merch is BACK',
    },
    {
      name: 'heroContent',
      type: 'richText',
      required: true,
    },
    {
      name: 'merchItems',
      type: 'relationship',
      relationTo: 'merch',
      hasMany: true,
      required: true,
    },
    {
      name: 'notices',
      type: 'richText',
      admin: {
        description: 'Rich text area for important notices shown below the grid.',
      },
    },
  ],
}
