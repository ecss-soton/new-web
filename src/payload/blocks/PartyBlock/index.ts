import type { Block } from 'payload/types'

import link from '../../fields/link'

export const PartyBlock: Block = {
  slug: 'partyBlock',
  labels: {
    singular: 'Party Block',
    plural: 'Party Blocks',
  },
  fields: [
    // ── Background ──────────────────────────────────────────────────────────
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Background Image',
      admin: {
        description: 'Full-page fixed background. Defaults to the wavy pattern if not set.',
      },
    },
     {
      name: 'floatingImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Floating Image',
      admin: {
        description: 'Floating images. Defaults to the flower pattern if not set.',
      },
    },

    // ── Hero Section ─────────────────────────────────────────────────────────
    {
      name: 'heroTitle',
      type: 'text',
      required: true,
      defaultValue: 'See you on the 5th of June at 7pm!',
    },
    {
      name: 'heroText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'decorationImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Decoration Image',
      admin: {
        description:
          'Small decorative image shown alongside the hero title (e.g. a flower graphic). Displayed at ~80–100 px.',
      },
    },
    {
      name: 'buttons',
      type: 'array',
      maxRows: 3,
      fields: [
        link({
          appearances: ['primary', 'secondary'],
        }),
      ],
    },

    // ── Reorderable Sections ─────────────────────────────────────────────────
    {
      name: 'sections',
      type: 'array',
      label: 'Sections',
      admin: {
        description:
          'Add, remove, and reorder content sections. Each section can be a wide image, a grid of square images, an event info block, a centred callout, FAQs, or organiser logos.',
        initCollapsed: true,
      },
      fields: [
        // discriminator
        {
          name: 'sectionType',
          type: 'select',
          required: true,
          label: 'Section Type',
          options: [
            { label: 'Big Image (wide 16:9)', value: 'bigImage' },
            { label: 'Square Images Grid', value: 'squareImages' },
            { label: 'Event Info Block', value: 'eventBlock' },
            { label: 'Centred Callout', value: 'centreCallout' },
            { label: 'FAQs', value: 'faqs' },
            { label: 'Organisers', value: 'organisers' },
          ],
        },

        // ── Big Image fields ──────────────────────────────────────────────
        {
          name: 'bigImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Image',
          admin: {
            condition: (_, siblingData) => siblingData?.sectionType === 'bigImage',
          },
        },

        // ── Square Images fields ──────────────────────────────────────────
        {
          name: 'squareImages',
          type: 'array',
          label: 'Images',
          admin: {
            condition: (_, siblingData) => siblingData?.sectionType === 'squareImages',
          },
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
          ],
        },

        // ── Event Block fields ────────────────────────────────────────────
        {
          name: 'eventBlock',
          type: 'group',
          label: 'Event Info Block',
          admin: {
            condition: (_, siblingData) => siblingData?.sectionType === 'eventBlock',
          },
          fields: [
            { name: 'title', type: 'text', required: true, defaultValue: 'Block Title' },
            { name: 'text', type: 'textarea', required: true },
            { name: 'image', type: 'upload', relationTo: 'media' },
            {
              name: 'imagePosition',
              type: 'select',
              label: 'Image Position',
              defaultValue: 'left',
              options: [
                { label: 'Image on Left', value: 'left' },
                { label: 'Image on Right', value: 'right' },
              ],
            },
            {
              name: 'backgroundColor',
              type: 'text',
              label: 'Background Colour',
              defaultValue: '#f6b84a',
              admin: {
                description: 'CSS colour value, e.g. #f6b84a or rgba(246,184,74,1)',
              },
            },
          ],
        },

        // ── Centre Callout fields ─────────────────────────────────────────
        {
          name: 'centreCallout',
          type: 'group',
          label: 'Centred Callout',
          admin: {
            condition: (_, siblingData) => siblingData?.sectionType === 'centreCallout',
          },
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
              defaultValue: 'Questions about allergies?',
            },
            link({
              appearances: ['primary', 'secondary', 'default'],
            }),
          ],
        },

        // ── FAQs fields ───────────────────────────────────────────────────
        {
          name: 'faqs',
          type: 'array',
          label: 'FAQs',
          admin: {
            condition: (_, siblingData) => siblingData?.sectionType === 'faqs',
          },
          fields: [
            { name: 'question', type: 'text', required: true },
            { name: 'answer', type: 'textarea', required: true },
          ],
        },

        // ── Organisers fields ─────────────────────────────────────────────
        {
          name: 'organisers',
          type: 'array',
          label: 'Organiser Logos',
          admin: {
            condition: (_, siblingData) => siblingData?.sectionType === 'organisers',
          },
          fields: [{ name: 'logo', type: 'upload', relationTo: 'media', required: true }],
        },
      ],
    },
  ],
}
