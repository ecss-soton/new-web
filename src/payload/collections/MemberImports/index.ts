import path from 'path'
import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { processCsvImport } from './hooks/processCsvImport'
import { validateCsvUpload } from './hooks/validateCsvUpload'

export const MemberImports: CollectionConfig = {
  slug: 'member-imports',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'runStatus', 'processedAt', 'updatedAt'],
    description:
      'Upload a SUSU membership export (.csv). Both the one-row-per-membership export and the one-row-per-member roll-up are supported; the Email column is optional. Active members are matched to website accounts by email/username or by a unique full name, and are given the susu role that allows voting.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  upload: {
    staticDir: path.resolve(__dirname, '../../../../media/member-imports'),
  },
  hooks: {
    beforeValidate: [validateCsvUpload],
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
