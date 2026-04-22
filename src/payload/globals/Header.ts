import type { AfterChangeHook } from 'payload/dist/globals/config/types'
import type { GlobalConfig } from 'payload/types'

import link from '../fields/link'
import { revalidateGlobal } from '../utilities/revalidate'

const revalidateHeader: AfterChangeHook = ({ doc, req: { payload } }) => {
  revalidateGlobal({ tag: 'global_header', globalLabel: 'Header', payload })
  return doc
}

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateHeader],
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
      ],
    },
  ],
}
