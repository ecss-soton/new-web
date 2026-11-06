import type { BeforeValidateHook } from 'payload/dist/collections/config/types'
import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import type { TicketHolder } from '../../payload-types'
import { normalizeSotonId } from '../../utilities/sotonId'
import Groups from '../groups'
import { exportTicketHolderCsv } from './endpoints/exportCsv'
import { importTicketHolderCsv } from './endpoints/importCsv'
import { importTicketHolderUsers } from './endpoints/importUsers'

/**
 * Keeps hand-edited rows matching the guest-list rules: the Azure AD
 * `mailNickname` is stored lower-cased and without the email domain, and every
 * booking lookup compares against that form.
 */
const normaliseSotonIdField: BeforeValidateHook<TicketHolder> = ({ data }) => {
  if (!data) return data

  if (typeof data.sotonId === 'string') {
    data.sotonId = normalizeSotonId(data.sotonId)
  }

  if (typeof data.name === 'string') {
    data.name = data.name.trim()
  }

  return data
}

export const TicketHolders: CollectionConfig = {
  slug: 'ticket-holders',
  labels: {
    singular: 'Ticket Holder',
    plural: 'Ticket Holders',
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Booking,
    defaultColumns: ['name', 'sotonId', 'plusOneCount', 'updatedAt'],
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  hooks: {
    beforeValidate: [normaliseSotonIdField],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'booking-events',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'The event this ticket is for.',
      },
    },
    // Guest-list uniqueness is per event, not global: the same person attends
    // multiple balls. A field-level `unique: true` here created a global Mongo
    // index that rejected every returning guest on import. The replacement
    // compound `{ sotonId, event }` unique index is created by
    // `src/scripts/migrateBookingIndexes.ts` — the Payload adapter only ever
    // *adds* indexes, so the old global index has to be dropped by that script
    // (see the file for details).
    {
      name: 'sotonId',
      type: 'text',
      label: 'University Username',
      required: true,
      admin: {
        description:
          'The university username (e.g. "ab1c23") — must match the Azure AD mailNickname. Unique per event.',
      },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Display Name',
      required: true,
    },
    {
      name: 'plusOneCount',
      type: 'number',
      label: 'Plus-One Count',
      defaultValue: 0,
      min: 0,
      max: 9,
      admin: {
        description: 'How many plus-ones this ticket holder can bring. Each plus-one takes a seat.',
      },
    },
    {
      name: 'dietaryRequirements',
      type: 'text',
      label: 'Dietary Requirements',
    },
  ],
  endpoints: [
    {
      path: '/import-csv',
      method: 'post',
      handler: importTicketHolderCsv,
    },
    {
      path: '/import-users',
      method: 'post',
      handler: importTicketHolderUsers,
    },
    {
      path: '/export-csv',
      method: 'get',
      handler: exportTicketHolderCsv,
    },
  ],
}
