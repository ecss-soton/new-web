import type { AfterChangeHook } from 'payload/dist/globals/config/types'
import type { GlobalConfig } from 'payload/types'

import { revalidateGlobal } from '../utilities/revalidate'

const revalidateSettings: AfterChangeHook = ({ doc, req: { payload } }) => {
  revalidateGlobal({ tag: 'global_settings', globalLabel: 'Settings', payload })
  return doc
}

export const Settings: GlobalConfig = {
  slug: 'settings',
  typescript: {
    interface: 'Settings',
  },
  graphQL: {
    name: 'Settings',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSettings],
  },
  fields: [
    {
      name: 'postsPage',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Posts page',
    },
    {
      name: 'projectsPage',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Projects page',
    },
  ],
}
