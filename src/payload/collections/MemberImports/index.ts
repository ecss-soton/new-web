import path from 'path'
import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { processCsvImport } from './hooks/processCsvImport'

export const MemberImports: CollectionConfig = {
  slug: 'member-imports',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'runStatus', 'processedAt', 'updatedAt'],
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  upload: {
    staticDir: path.resolve(__dirname, '../../../../media/member-imports'),
    mimeTypes: ['text/csv', 'application/vnd.ms-excel'],
  },
  hooks: {
    afterChange: [processCsvImport],
  },
  fields: [
    {
      name: 'runStatus',
      type: 'select',
      defaultValue: 'queued',
      options: [
        {
          label: 'queued',
          value: 'queued',
        },
        {
          label: 'running',
          value: 'running',
        },
        {
          label: 'completed',
          value: 'completed',
        },
        {
          label: 'failed',
          value: 'failed',
        },
      ],
      admin: {
        readOnly: true,
      },
      access: {
        create: () => false,
      },
    },
    {
      name: 'processedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
      access: {
        create: () => false,
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
      access: {
        create: () => false,
      },
    },
  ],
}
