import type { AfterChangeHook } from 'payload/dist/globals/config/types'
import type { GlobalConfig } from 'payload/types'

import link from '../fields/link'
import { revalidateGlobal } from '../utilities/revalidate'

const revalidateFooter: AfterChangeHook = ({ doc, req: { payload } }) => {
  revalidateGlobal({ tag: 'global_footer', globalLabel: 'Footer', payload })
  return doc
}

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateFooter],
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      maxRows: 8,
      fields: [
        link({
          appearances: false,
        }),
        {
          name: 'icon',
          label: 'SVG Icon',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
