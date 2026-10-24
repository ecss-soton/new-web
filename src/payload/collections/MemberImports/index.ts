import path from 'path'
import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { reapplyMemberships } from './endpoints/reapplyMemberships'
import { processCsvImport } from './hooks/processCsvImport'
import { validateCsvUpload } from './hooks/validateCsvUpload'
import { ReapplyMembershipsLink } from './react/ReapplyMembershipsLink'

export const MemberImports: CollectionConfig = {
  slug: 'member-imports',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'runStatus', 'processedAt', 'updatedAt'],
    description:
      'Upload a SUSU membership export (.csv). Both the one-row-per-membership export and the one-row-per-member roll-up are supported; the Email column is optional. Importing stores the members in the SUSU Members collection and grants the susu role to matching accounts. New accounts are matched automatically on first login; use the re-apply action after a matching fix.',
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
  endpoints: [
    {
      path: '/reapply',
      method: 'post',
      handler: reapplyMemberships,
    },
  ],
  fields: [
    {
      name: 'reapplyMemberships',
      type: 'ui',
      admin: {
        components: {
          Field: ReapplyMembershipsLink,
        },
      },
    },
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
