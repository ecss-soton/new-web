import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { isAdmin } from '../../access/isAdmin'
import { normalizeSotonId } from '../../utilities/sotonId'
import Groups from '../groups'

/**
 * Splits one CSV row, honouring double-quoted fields (including escaped `""`).
 * Guest names are the reason this exists — a name like `Lovelace, Ada` would
 * otherwise shift every later column.
 */
const splitCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields.map(field => field.trim())
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
      handler: async (req, res) => {
        const { user, payload } = req

        if (!user || !isAdmin(user)) {
          return res.status(401).json({ error: 'Admin access required' })
        }

        const { csv, eventId } = req.body as { csv?: string; eventId?: string }

        if (!csv || typeof csv !== 'string') {
          return res.status(400).json({ error: 'Missing "csv" field with CSV text' })
        }

        if (!eventId) {
          return res.status(400).json({ error: 'Missing "eventId" field' })
        }

        // Verify event exists, and keep it so rows can be validated against the
        // event's seat allocation.
        let event
        try {
          event = await payload.findByID({
            collection: 'booking-events',
            id: eventId,
            depth: 0,
          })
        } catch {
          return res.status(400).json({ error: 'Event not found' })
        }

        const seatsPerTable = event.seatsPerTable || 10

        const lines = csv
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('#'))

        if (lines.length === 0) {
          return res.status(400).json({ error: 'CSV is empty' })
        }

        // First line is header: sotonId,name,plusOneCount,dietaryRequirements
        const header = splitCsvLine(lines[0]).map(h => h.toLowerCase())
        const rows = lines.slice(1)

        let created = 0
        let updated = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
          const cols = splitCsvLine(rows[i])
          const record: Record<string, string> = {}
          for (let j = 0; j < header.length; j++) {
            record[header[j]] = cols[j] || ''
          }

          // Accept either a university username ("ab1c23") or an email
          // ("ab1c23@soton.ac.uk"); guest-list checks compare against the
          // Azure AD mailNickname.
          const sotonId = normalizeSotonId(record.sotonid)
          const name = record.name

          if (!sotonId || !name) {
            errors.push(`Row ${i + 1}: missing sotonId or name`)
            continue
          }

          const plusOneCount = Math.max(0, parseInt(record.plusonecount, 10) || 0)
          const dietary = record.dietaryrequirements || ''

          // A guest who cannot fit at an empty table can never be seated.
          if (1 + plusOneCount > seatsPerTable) {
            errors.push(
              `Row ${i + 1} (${sotonId}): needs ${
                1 + plusOneCount
              } seats but a table only has ${seatsPerTable}`,
            )
            continue
          }

          try {
            const existing = await payload.find({
              collection: 'ticket-holders',
              where: {
                and: [{ sotonId: { equals: sotonId } }, { event: { equals: eventId } }],
              },
              limit: 1,
              depth: 0,
            })

            if (existing.totalDocs > 0) {
              await payload.update({
                collection: 'ticket-holders',
                id: existing.docs[0].id,
                data: {
                  event: eventId,
                  name,
                  plusOneCount,
                  dietaryRequirements: dietary || undefined,
                },
              })
              updated++
            } else {
              await payload.create({
                collection: 'ticket-holders',
                data: {
                  event: eventId,
                  sotonId,
                  name,
                  plusOneCount,
                  dietaryRequirements: dietary || undefined,
                },
              })
              created++
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            errors.push(`Row ${i + 1} (${sotonId}): ${msg}`)
          }
        }

        return res.json({
          success: errors.length === 0,
          summary: `Created ${created}, updated ${updated}, errors ${errors.length}`,
          created,
          updated,
          errors: errors.length > 0 ? errors : undefined,
        })
      },
    },
  ],
}
