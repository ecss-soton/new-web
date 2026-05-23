import type { Block } from 'payload/types'

export const NextEvent: Block = {
  slug: 'nextEvent',
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'subheading',
      type: 'text',
      label: 'Subheading',
      defaultValue: 'Next Event',
    },
    {
      name: 'fallbackTitle',
      type: 'text',
      label: 'Fallback Title (when no events)',
      defaultValue: 'No Events Found',
    },
    {
      name: 'eventsLinkText',
      type: 'text',
      label: 'Link Text (see all events)',
      defaultValue: 'See all events →',
    },
    {
      name: 'eventsLinkUrl',
      type: 'text',
      label: 'Link URL',
      defaultValue: '/events',
    },
    {
      name: 'timezone',
      type: 'text',
      label: 'Timezone',
      defaultValue: 'Europe/London',
      admin: {
        description: 'Moment.js timezone string for event time formatting.',
      },
    },
  ],
}
