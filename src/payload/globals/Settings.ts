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
      name: 'siteName',
      type: 'text',
      label: 'Site Name',
      defaultValue: 'ECSS',
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'Contact Email',
      defaultValue: 'society@ecs.soton.ac.uk',
    },
    {
      name: 'emailDomain',
      type: 'text',
      label: 'Email Domain',
      defaultValue: '@soton.ac.uk',
      admin: {
        description: 'Domain appended to usernames for constructing email addresses.',
      },
    },
    {
      name: 'siteLogo',
      type: 'upload',
      relationTo: 'media',
      label: 'Site Logo (Light)',
      admin: {
        description: 'Logo used in the header for light mode.',
      },
    },
    {
      name: 'siteLogoDark',
      type: 'upload',
      relationTo: 'media',
      label: 'Site Logo (Dark)',
      admin: {
        description: 'Logo used in the header for dark mode. Falls back to Site Logo if not set.',
      },
    },
    {
      name: 'footerLogo',
      type: 'upload',
      relationTo: 'media',
      label: 'Footer Logo',
      admin: {
        description: 'Logo displayed in the footer.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Pages',
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
        },
        {
          label: 'Jumpstart',
          fields: [
            {
              name: 'jumpstartEnabled',
              type: 'checkbox',
              label: 'Enable Jumpstart Mode',
              defaultValue: false,
              admin: {
                description:
                  'When enabled, the homepage displays the Jumpstart timeline instead of the regular homepage.',
              },
            },
            {
              name: 'jumpstartHeading',
              type: 'text',
              label: 'Jumpstart Heading',
              defaultValue: 'Jumpstart 2025',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
              },
            },
            {
              name: 'jumpstartSubtitle',
              type: 'textarea',
              label: 'Jumpstart Subtitle',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
              },
            },
            {
              name: 'jumpstartAbout',
              type: 'textarea',
              label: 'About Sidebar',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
                description: '"WHO ARE ECSS?" sidebar text on the Jumpstart page.',
              },
            },
          ],
        },
      ],
    },
  ],
}
