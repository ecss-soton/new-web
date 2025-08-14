import { Block } from 'payload/types'

import { isHTTPS } from '../../validate/isHTTPS'

export const Button: Block = {
  slug: 'button',
  labels: {
    singular: 'Button',
    plural: 'Buttons',
  },
  fields: [
    {
      name: 'text',
      label: 'Text',
      type: 'text',
      required: true,
    },
    {
      name: 'link',
      label: 'Link',
      type: 'text',
      validate: isHTTPS,
    },
    {
      name: 'appearance',
      label: 'Appearance',
      type: 'select',
      defaultValue: 'default',
      options: [
        {
          value: 'default',
          label: 'Default',
        },
        {
          value: 'primary',
          label: 'Primary',
        },
        {
          value: 'secondary',
          label: 'Secondary',
        },
        {
          value: 'none',
          label: 'None',
        },
      ],
    },
  ],
}
