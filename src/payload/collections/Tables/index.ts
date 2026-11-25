import type { CollectionConfig } from 'payload/types'

import { normalizeTableNameMode, tableDisplayName } from '../../../utilities/booking/tableName'
import { rankTables } from '../../../utilities/booking/tableNumbers'
import { admins } from '../../access/admins'
import { isAdmin } from '../../access/isAdmin'
import { relationshipId, relationshipIds } from '../../utilities/relationships'
import Groups from '../groups'
import { adminDeleteTable } from './endpoints/adminDeleteTable'
import { adminRemoveTableMember } from './endpoints/adminRemoveTableMember'
import { createTable } from './endpoints/createTable'
import { exportSeatPlan } from './endpoints/exportSeatPlan'
import { getTableSeats } from './endpoints/getTableSeats'
import { joinTable } from './endpoints/joinTable'
import { leaveTable } from './endpoints/leaveTable'
import { manageSeats } from './endpoints/manageSeats'
import { setTableNameMode } from './endpoints/setTableNameMode'
import { toggleLock } from './endpoints/toggleLock'
import { beforeTableChange } from './hooks/beforeTableChange'

export const Tables: CollectionConfig = {
  slug: 'tables',
  labels: {
    singular: 'Table',
    plural: 'Tables',
  },
  admin: {
    useAsTitle: 'joinCode',
    group: Groups.Booking,
    defaultColumns: ['joinCode', 'nameMode', 'owner', 'memberCount', 'locked', 'createdAt'],
  },
  access: {
    read: () => false,
    create: admins,
    update: admins,
    delete: admins,
  },
  hooks: {
    beforeChange: [beforeTableChange],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'booking-events',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'The event this table belongs to.',
      },
    },
    {
      name: 'joinCode',
      type: 'text',
      label: 'Join Code',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'The 8-character code users share to invite others.',
      },
    },
    {
      name: 'nameMode',
      type: 'select',
      label: 'Table Name',
      defaultValue: 'ownerName',
      options: [
        {
          label: "Owner's first name (e.g. Indigo's Table)",
          value: 'ownerName',
        },
        {
          label: 'Join code (e.g. Table ABCD2345)',
          value: 'joinCode',
        },
      ],
      admin: {
        description:
          'What the table is called on the booking page. The owner can switch between these two from the seat plan; only these two options are available.',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'locked',
      type: 'checkbox',
      label: 'Locked',
      defaultValue: false,
      admin: {
        description:
          'When locked, nobody can join, leave or change seats. Only the owner (or an admin) can unlock.',
      },
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Members',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'memberCount',
      type: 'number',
      label: 'Member Count',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        description:
          'Total seat usage including members and their plus-ones. Derived from the member list.',
      },
    },
    {
      name: 'seatPositions',
      type: 'array',
      label: 'Seat Positions',
      admin: {
        description: 'Seat assignments. Index = seat number, name = who is sitting there.',
      },
      fields: [
        {
          name: 'seatIndex',
          type: 'number',
          required: true,
        },
        {
          name: 'userId',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
            description: 'The member this seat belongs to. Display names are derived from it.',
          },
        },
        {
          name: 'plusOneOf',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
            description:
              "Set when this seat is one of a member's plus-ones. The label is derived from the member's guest-list allowance.",
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/',
      method: 'get',
      handler: async (req, res) => {
        const { user, payload } = req

        if (!user) {
          return res.status(401).json({ error: 'Login required' })
        }

        const eventId = (req.query.event as string) || ''

        let event
        try {
          event = await payload.findByID({
            collection: 'booking-events',
            id: eventId,
            depth: 0,
          })
        } catch {
          return res.status(400).json({ error: 'Invalid event ID' })
        }

        const tables = await payload.find({
          collection: 'tables',
          where: {
            event: { equals: eventId },
          },
          depth: 1,
          sort: 'createdAt',
          pagination: false,
        })

        // The depth-1 find populates each owner, which is where the display name
        // comes from. A deleted account simply falls back to the join code.
        const ownerInfoById = new Map<string, { name?: string | null; username?: string | null }>()
        for (const table of tables.docs) {
          const owner = table.owner as unknown
          if (!owner || typeof owner !== 'object') continue
          const doc = owner as { id?: string; name?: string | null; username?: string | null }
          if (doc.id) ownerInfoById.set(doc.id, { name: doc.name, username: doc.username })
        }

        const displayNameFor = (table: {
          joinCode: string
          nameMode?: unknown
          owner: unknown
        }): string => {
          const ownerId = relationshipId(table.owner)
          const info = ownerId ? ownerInfoById.get(ownerId) : undefined
          return tableDisplayName({
            nameMode: normalizeTableNameMode(table.nameMode),
            joinCode: table.joinCode,
            ownerName: info?.name,
            ownerUsername: info?.username,
          })
        }

        // Active tables (at least one member) are numbered 1..N by creation order;
        // the seat plan and the seat-plan export use the same helper.
        const tableNumbers = rankTables(
          tables.docs.filter(t => relationshipIds(t.members).length > 0),
        )

        const yourTable = tables.docs.find(t => {
          return relationshipIds(t.members).includes(user.id)
        })

        const yourSeatEntry = yourTable
          ? (yourTable.seatPositions ?? []).find(
              seat => relationshipId((seat as { userId?: unknown }).userId) === user.id,
            )
          : undefined
        const yourSeat = yourSeatEntry ? yourSeatEntry.seatIndex + 1 : null

        const formattedTables = tables.docs
          // Admins can manage every table, including empty ones after booking closes.
          .filter(t => relationshipIds(t.members).length > 0 || isAdmin(user))
          .map(t => ({
            id: t.id,
            joinCode: t.joinCode,
            name: displayNameFor(t),
            number: tableNumbers.get(t.id),
            locked: t.locked,
            isOwner: relationshipId(t.owner) === user.id,
            members: Array.isArray(t.members)
              ? t.members.map(m => {
                  if (typeof m === 'string') return { id: m, name: 'Unknown' }
                  return {
                    id: m.id,
                    name: (m.name as string) || (m.username as string) || 'Unknown',
                  }
                })
              : [],
            memberCount: t.memberCount,
          }))

        return res.json({
          yourTable: yourTable
            ? {
                id: yourTable.id,
                joinCode: yourTable.joinCode,
                name: displayNameFor(yourTable),
                number: tableNumbers.get(yourTable.id),
                yourSeat,
                locked: yourTable.locked,
                isOwner: relationshipId(yourTable.owner) === user.id,
                memberCount: yourTable.memberCount,
              }
            : null,
          event: {
            id: event.id,
            name: event.name,
            slug: event.slug,
            description: event.description,
            isOpen: event.isOpen,
            maxTables: event.maxTables,
            seatsPerTable: event.seatsPerTable,
          },
          tables: formattedTables,
          isAdmin: isAdmin(user),
        })
      },
    },
    {
      path: '/export-seat-plan',
      method: 'get',
      handler: exportSeatPlan,
    },
    {
      path: '/create',
      method: 'post',
      handler: createTable,
    },
    {
      path: '/:id/join',
      method: 'post',
      handler: joinTable,
    },
    {
      path: '/:id/leave',
      method: 'post',
      handler: leaveTable,
    },
    {
      path: '/:id/lock',
      method: 'patch',
      handler: toggleLock,
    },
    {
      path: '/:id/name',
      method: 'patch',
      handler: setTableNameMode,
    },
    {
      path: '/:id/delete',
      method: 'post',
      handler: adminDeleteTable,
    },
    {
      path: '/:id/remove-member',
      method: 'post',
      handler: adminRemoveTableMember,
    },
    {
      path: '/:id/seats',
      method: 'get',
      handler: getTableSeats,
    },
    {
      path: '/:id/seats',
      method: 'patch',
      handler: manageSeats,
    },
  ],
}
