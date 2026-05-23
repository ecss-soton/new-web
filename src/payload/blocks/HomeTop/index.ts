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
      name: 'backgroundImage',
      label: 'Background Image',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      type: 'group',
      name: 'stats',
      label: 'Stats Display',
      fields: [
        {
          name: 'membersLink',
          type: 'group',
          label: 'Members Link',
          fields: [
            {
              name: 'url',
              type: 'text',
              label: 'URL',
              defaultValue: '/societies',
            },
            {
              name: 'label',
              type: 'text',
              label: 'Label',
              defaultValue: 'members',
            },
          ],
        },
        {
          name: 'committeeLink',
          type: 'group',
          label: 'Committee Link',
          fields: [
            {
              name: 'url',
              type: 'text',
              label: 'URL',
              defaultValue: '/committee',
            },
            {
              name: 'label',
              type: 'text',
              label: 'Label',
              defaultValue: 'committee',
            },
          ],
        },
      ],
    },
  ],
}
