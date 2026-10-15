import type { CollectionConfig } from 'payload/types'

import { HACKATHON_TYPES } from '../../utilities/hackathonTypes'
import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { createRevalidateTagHook } from '../utilities/revalidate'
import { isDiscordUrl, isLumaUrl } from '../validate/eventLinks'
import { isHTTPS } from '../validate/isHTTPS'
import { isSafeLink } from '../validate/isSafeLink'

const Hackathons: CollectionConfig = {
  slug: 'hackathons',
  access: {
    read: adminsOrPublished,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'startDate', 'featured'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    afterChange: [createRevalidateTagHook('hackathons', 'Hackathons archive')],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [...HACKATHON_TYPES],
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd-MM-yyyy HH:mm',
        },
      },
    },
    {
      name: 'endDate',
      label: 'End Date',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd-MM-yyyy HH:mm',
        },
      },
    },
    {
      name: 'location',
      label: 'Location',
      type: 'text',
    },
    {
      name: 'mapsUrl',
      label: 'Google Maps URL',
      type: 'text',
      validate: isHTTPS,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
    },
    {
      name: 'image',
      label: 'Image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'organiser',
      label: 'Organiser',
      type: 'text',
    },
    {
      name: 'prize',
      label: 'Prize',
      type: 'text',
    },
    {
      name: 'featured',
      label: 'Featured',
      type: 'checkbox',
    },
    {
      name: 'sortOrder',
      label: 'Sort Order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers appear first within featured/upcoming ordering.',
      },
    },
    {
      type: 'collapsible',
      label: 'Links',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'websiteUrl',
          label: 'Website',
          type: 'text',
          validate: isSafeLink,
        },
        {
          name: 'applyUrl',
          label: 'Apply / Sign-up',
          type: 'text',
          validate: isSafeLink,
        },
        {
          name: 'lumaUrl',
          label: 'Luma link',
          type: 'text',
          validate: isLumaUrl,
        },
        {
          name: 'discordUrl',
          label: 'Discord link',
          type: 'text',
          validate: isDiscordUrl,
        },
      ],
    },
  ],
}

export default Hackathons
