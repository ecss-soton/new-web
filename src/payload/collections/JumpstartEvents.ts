import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { slugField } from '../fields/slug'
import { isHTTPS } from '../validate/isHTTPS'

const JumpstartEvents: CollectionConfig = {
  slug: 'jumpstartEvents',
  access: {
    read: () => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location'],
  },
  // versions: {
  //   drafts: false,
  // },
  fields: [
    slugField(),
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'link',
      label: 'External link url',
      type: 'text',
      validate: isHTTPS,
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd-MM-yyyy hh:mm',
        },
      },
    },
    {
      name: 'endTime',
      label: 'End Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
          displayFormat: 'hh:mm',
        },
      },
    },
    {
      name: 'location',
      label: 'Location',
      type: 'text',
    },
  ],
}

export default JumpstartEvents
