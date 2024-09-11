import type { Block } from 'payload/types'

export const NextEvent: Block = {
  slug: 'nextEvent',
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}
