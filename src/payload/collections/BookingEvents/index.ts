import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { slugField } from '../../fields/slug'
import Groups from '../groups'

export const BookingEvents: CollectionConfig = {
  slug: 'booking-events',
  labels: {
    singular: 'Booking Event',
    plural: 'Booking Events',
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Booking,
    defaultColumns: ['name', 'isOpen', 'date', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Event Name',
      required: true,
      unique: true,
      admin: {
        description: 'e.g. "Winter Ball 2025"',
      },
    },
    slugField('name', {
      admin: {
        description: 'URL-safe identifier (auto-generated from name)',
      },
    }),
    {
      name: 'date',
      type: 'date',
      label: 'Event Date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'isOpen',
      type: 'checkbox',
      label: 'Booking Open',
      defaultValue: false,
      admin: {
        description: 'When checked, users can create and join tables for this event.',
      },
    },
    {
      name: 'maxTables',
      type: 'number',
      label: 'Maximum Tables',
      defaultValue: 17,
      min: 1,
      admin: {
        description: 'Maximum number of tables for this event.',
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
  ],
}
