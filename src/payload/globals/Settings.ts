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
              name: 'jumpstartLogo',
              type: 'upload',
              relationTo: 'media',
              label: 'Jumpstart Logo',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
                description:
                  'Replaces the text-based "jumpstart" brand in the hero. Falls back to a default logo if not set.',
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
              name: 'jumpstartFaqTitle',
              type: 'text',
              label: 'FAQ Section Title',
              defaultValue: 'FAQS',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
              },
            },
            {
              name: 'jumpstartFaqJumpLabel',
              type: 'text',
              label: 'FAQ Jump Button Label',
              defaultValue: 'Questions?',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
                description:
                  'Label for the button that jumps to the FAQ section at the bottom of the page.',
              },
            },
            {
              name: 'jumpstartFaqs',
              type: 'array',
              label: 'FAQs',
              admin: {
                condition: (_, siblingData) => siblingData?.jumpstartEnabled,
                description:
                  'Frequently asked questions shown at the bottom of the Jumpstart page.',
              },
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'News',
          fields: [
            {
              name: 'newsMastheadTitle',
              type: 'text',
              label: 'Masthead title',
              defaultValue: 'The ECSS Times',
            },
            {
              name: 'newsMastheadEyebrow',
              type: 'text',
              label: 'Masthead eyebrow',
              defaultValue: 'University of Southampton Electronics & Computer Science Society',
            },
            {
              name: 'newsArchiveTagline',
              type: 'text',
              label: 'Archive tagline',
              defaultValue: 'The archive of our monthly newsletters',
            },
            {
              name: 'newsEmptyState',
              type: 'text',
              label: 'Empty state message',
              defaultValue: 'No newsletters have been published yet.',
            },
            {
              name: 'newsCoverPlaceholder',
              type: 'text',
              label: 'Cover placeholder text',
              defaultValue: 'ECSS Times',
            },
            {
              name: 'newsPrintEditionLabel',
              type: 'text',
              label: 'Print edition link label',
              defaultValue: 'Download the print edition (PDF)',
            },
            {
              name: 'newsSeoTitle',
              type: 'text',
              label: 'Archive SEO title',
              defaultValue: 'The ECSS Times',
            },
            {
              name: 'newsSeoDescription',
              type: 'textarea',
              label: 'Archive SEO description',
              defaultValue: 'Monthly newsletters and the ECSS Times archive.',
            },
          ],
        },
      ],
    },
  ],
}
