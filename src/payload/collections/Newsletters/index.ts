import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { adminsOrPublished } from '../../access/adminsOrPublished'
import { Article } from '../../blocks/Article'
import { Briefs } from '../../blocks/Briefs'
import { Figure } from '../../blocks/Figure'
import { SectionRule } from '../../blocks/SectionRule'
import { slugField } from '../../fields/slug'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { createRevalidateHook, createRevalidateTagHook } from '../../utilities/revalidate'

export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  labels: {
    singular: 'Newsletter',
    plural: 'Newsletters',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'issueNumber', 'publishedAt', 'updatedAt'],
    preview: doc => {
      return `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/next/preview?url=${encodeURIComponent(
        `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/news/${doc?.slug}`,
      )}&secret=${process.env.PAYLOAD_PUBLIC_DRAFT_SECRET}`
    },
  },
  hooks: {
    beforeChange: [populatePublishedAt],
    afterChange: [
      createRevalidateHook('newsletters'),
      createRevalidateTagHook('newsletters', 'Newsletters archive'),
    ],
  },
  versions: {
    drafts: true,
  },
  access: {
    read: adminsOrPublished,
    update: admins,
    create: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'issueNumber',
      label: 'Issue number',
      type: 'number',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Published at',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Short summary shown on the archive page.',
      },
    },
    {
      name: 'coverImage',
      label: 'Cover image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'printEdition',
      label: 'Print edition (PDF)',
      type: 'upload',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'layout',
      label: 'Content',
      type: 'blocks',
      required: true,
      blocks: [Article, Figure, Briefs, SectionRule],
    },
    slugField(),
  ],
}
