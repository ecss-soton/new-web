import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { isAdmin } from '../../access/isAdmin'
import { relationshipId, relationshipIds } from '../../utilities/relationships'
import Groups from '../groups'
import { createTable } from './endpoints/createTable'
import { getTableByJoinCode } from './endpoints/getTableByJoinCode'
import { joinTable } from './endpoints/joinTable'
import { leaveTable } from './endpoints/leaveTable'
import { manageSeats } from './endpoints/manageSeats'
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
    defaultColumns: ['joinCode', 'owner', 'memberCount', 'locked', 'createdAt'],
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

        const yourTable = tables.docs.find(t => {
          return relationshipIds(t.members).includes(user.id)
        })

        const formattedTables = tables.docs
          .filter(t => relationshipIds(t.members).length > 0 || (isAdmin(user) && event.isOpen))
          .map(t => ({
            id: t.id,
            joinCode: t.joinCode,
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
            seatPositions: t.seatPositions,
            memberCount: t.memberCount,
          }))

        return res.json({
          yourTable: yourTable
            ? {
                id: yourTable.id,
                joinCode: yourTable.joinCode,
                locked: yourTable.locked,
                isOwner: relationshipId(yourTable.owner) === user.id,
                memberCount: yourTable.memberCount,
              }
            : null,
          event: {
            id: event.id,
            name: event.name,
            slug: event.slug,
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
      path: '/:id/seats',
      method: 'get',
      handler: async (req, res) => {
        const { user, payload } = req

        if (!user) {
          return res.status(401).json({ error: 'Login required' })
        }

        const table = await getTableByJoinCode(payload, req.params.id)

        if (!table) {
          return res.status(404).json({ error: 'Table not found' })
        }

        const eventId = relationshipId(table.event)
        if (!eventId) {
          return res.status(500).json({ error: 'Table has no event' })
        }

        let event
        try {
          event = await payload.findByID({
            collection: 'booking-events',
            id: eventId,
            depth: 0,
          })
        } catch {
          return res.status(500).json({ error: 'Event not found' })
        }

        const memberIds = relationshipIds(table.members)
        const isMember = memberIds.includes(user.id)
        const seatsPerTable = event.seatsPerTable || 10
        const memberCount = table.memberCount || 0
        const full = memberCount >= seatsPerTable

        const filledSeats: Array<{ userId: string | null; name: string } | null> =
          Array(seatsPerTable).fill(null)
        const seatPositions = table.seatPositions as
          | Array<{ seatIndex: number; userId?: string | { id: string } | null; name: string }>
          | undefined
        if (seatPositions) {
          for (const s of seatPositions) {
            if (s.seatIndex < 0 || s.seatIndex >= seatsPerTable) continue

            // A seat pointing at someone who has since left the table is stale
            // and is dropped from the rendered plan (the next save prunes it).
            const seatUserId = relationshipId(s.userId)
            if (seatUserId && !memberIds.includes(seatUserId)) continue

            filledSeats[s.seatIndex] = { userId: seatUserId ?? null, name: s.name }
          }
        }

        const members: Array<{ id: string; name: string }> = []

        if (memberIds.length > 0) {
          const usersResult = await payload.find({
            collection: 'users',
            where: { id: { in: memberIds } },
            pagination: false,
            depth: 0,
            overrideAccess: true,
          })
          for (const u of usersResult.docs) {
            members.push({
              id: u.id,
              name: (u.name as string) || (u.username as string) || 'Unknown',
            })
          }
        }

        // Any signed-in user may view a table's seat plan so a shared link works
        // as an invite; joining is still gated by the guest list, the lock, the
        // booking window and the remaining capacity.
        return res.json({
          seats: filledSeats,
          members,
          yourTable: isMember,
          isMember,
          isOwner: relationshipId(table.owner) === user.id,
          isAdmin: isAdmin(user),
          locked: Boolean(table.locked),
          full,
          bookingOpen: Boolean(event.isOpen),
          canJoin: !isMember && !table.locked && Boolean(event.isOpen) && !full,
          joinCode: table.joinCode,
          eventSlug: event.slug,
          seatsPerTable,
          memberCount,
        })
      },
    },
    {
      path: '/:id/seats',
      method: 'patch',
      handler: manageSeats,
    },
  ],
}
