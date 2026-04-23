import type { Block } from 'payload/types'

export const HomeTop: Block = {
  slug: 'homeTop',
  labels: {
    singular: 'Home Top',
    plural: 'Home Tops',
  },
  fields: [
    {
      name: 'heading',
      label: 'Heading',
      type: 'text',
      required: true,
    },
    {
      name: 'show_on_mobile',
      label: 'Show on mobile',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'image1',
      label: 'Image 1',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'image2',
      label: 'Image 2',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'image3',
      label: 'Image 3',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
  ],
}
