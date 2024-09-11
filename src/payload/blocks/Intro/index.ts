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
  ],
}
