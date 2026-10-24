import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import Groups from './groups'

/**
 * Durable copy of the membership rows from the last SUSU imports.
 *
 * The uploaded CSV is only read while the import runs. Later account creation
 * (first Azure AD login) matches against this collection instead, so a redeploy,
 * restart or a second app instance cannot break role assignment.
 *
 * Every import upserts by `susuId`; records that were not present in the newest
 * file keep their previous values. Roles are still add-only (see AGENTS.md).
 */
export const SusuMembers: CollectionConfig = {
  slug: 'susu-members',
  admin: {
    group: Groups.Membership,
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'active', 'lastImport', 'updatedAt'],
    description:
      'Membership records imported from SUSU CSV exports. This is the durable source used to grant the susu role (and therefore voting access); it does not depend on the uploaded file still existing.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'susuId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'Stable key: the SUSU User ID, or an email/name fallback.',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'firstName',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastName',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'email',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'normalizedName',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description: 'Lower-case "first last" used to match website accounts.',
      },
    },
    {
      name: 'nameEndpoint',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description: 'First + last name token, used when middle names differ.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastImport',
      type: 'relationship',
      relationTo: 'member-imports',
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
