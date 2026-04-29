import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { isAdmin } from '../../access/isAdmin'
import Groups from '../groups'

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
      name: 'sotonId',
      type: 'text',
      label: 'University Username',
      required: true,
      unique: true,
      admin: {
        description:
          'The university username (e.g. "ab1c23") — must match the Azure AD mailNickname.',
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
      name: 'plusOneNames',
      type: 'array',
      label: 'Plus-One Names',
      admin: {
        description: 'Names of the plus-ones (for seat assignment).',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
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

        const { csv } = req.body as { csv?: string }

        if (!csv || typeof csv !== 'string') {
          return res.status(400).json({ error: 'Missing "csv" field with CSV text' })
        }

        const lines = csv
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('#'))

        if (lines.length === 0) {
          return res.status(400).json({ error: 'CSV is empty' })
        }

        // First line is header: sotonId,name,plusOneCount,dietaryRequirements,plusOne1,plusOne2,...
        const header = lines[0]
          .toLowerCase()
          .split(',')
          .map(h => h.trim())
        const rows = lines.slice(1)

        let created = 0
        let updated = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim())
          const record: Record<string, string> = {}
          for (let j = 0; j < header.length; j++) {
            record[header[j]] = cols[j] || ''
          }

          const sotonId = record.sotonid
          const name = record.name

          if (!sotonId || !name) {
            errors.push(`Row ${i + 1}: missing sotonId or name`)
            continue
          }

          const plusOneCount = parseInt(record.plusonecount, 10) || 0
          const dietary = record.dietaryrequirements || ''

          const plusOneNames: Array<{ name: string }> = []
          let pIdx = 1
          while (record[`plusone${pIdx}`]) {
            plusOneNames.push({ name: record[`plusone${pIdx}`] })
            pIdx++
          }

          try {
            const existing = await payload.find({
              collection: 'ticket-holders',
              where: { sotonId: { equals: sotonId } },
              limit: 1,
              depth: 0,
            })

            if (existing.totalDocs > 0) {
              await payload.update({
                collection: 'ticket-holders',
                id: existing.docs[0].id,
                data: {
                  name,
                  plusOneCount,
                  plusOneNames,
                  dietaryRequirements: dietary || undefined,
                },
              })
              updated++
            } else {
              await payload.create({
                collection: 'ticket-holders',
                data: {
                  sotonId,
                  name,
                  plusOneCount,
                  plusOneNames,
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
          success: true,
          summary: `Created ${created}, updated ${updated}, errors ${errors.length}`,
          created,
          updated,
          errors: errors.length > 0 ? errors : undefined,
        })
      },
    },
  ],
}
