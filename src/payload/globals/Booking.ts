import type { AfterChangeHook } from 'payload/dist/globals/config/types'
import type { GlobalConfig } from 'payload/types'

import { revalidateGlobal } from '../utilities/revalidate'

const revalidateBooking: AfterChangeHook = ({ doc, req: { payload } }) => {
  revalidateGlobal({ tag: 'global_booking', globalLabel: 'Booking', payload })
  return doc
}

export const Booking: GlobalConfig = {
  slug: 'booking',
  label: 'Table Booking Settings',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateBooking],
  },
  fields: [
    {
      name: 'isOpen',
      type: 'checkbox',
      label: 'Booking Open',
      defaultValue: false,
      admin: {
        description:
          'When checked, users can create and join tables. Admins can always manage tables.',
      },
    },
    {
      name: 'maxTables',
      type: 'number',
      label: 'Maximum Tables',
      defaultValue: 17,
      min: 1,
      admin: {
        description: 'Maximum number of tables that can be created.',
      },
    },
    {
      name: 'seatsPerTable',
      type: 'number',
      label: 'Seats Per Table',
      defaultValue: 10,
      min: 2,
      max: 20,
      admin: {
        description: 'Number of seats per table (including plus-ones).',
      },
    },
    {
      name: 'eventName',
      type: 'text',
      label: 'Event Name',
      admin: {
        description: 'Name of the event (e.g. "Winter Ball 2025"). Shown on the booking page.',
      },
    },
  ],
}
