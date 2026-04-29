import { randomBytes } from 'crypto'
import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { isAdmin } from '../../access/isAdmin'
import Groups from '../groups'
import { createTable } from './endpoints/createTable'
import { getTableByJoinCode } from './endpoints/getTableByJoinCode'
import { joinTable } from './endpoints/joinTable'
import { leaveTable } from './endpoints/leaveTable'
import { manageSeats } from './endpoints/manageSeats'
import { toggleLock } from './endpoints/toggleLock'
import { randomInt} from 'crypto'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const generateJoinCode = (): string => {
  const bytes = randomBytes(8)
  let result = ''
  for (let i = 0; i < 8; i++) {
    const index = randomInt(0, CHARS.length);
    result += CHARS[index];
  }
  return result
}

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
    read: () => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.joinCode) {
          data.joinCode = generateJoinCode()
        }
        return data
      },
    ],
  },
  fields: [
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
        description: 'When locked, new members cannot join.',
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
        description: 'Total seat usage including members and their plus-ones.',
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

        const bookingSettings = await payload.findGlobal({ slug: 'booking' })

        const tables = await payload.find({
          collection: 'tables',
          depth: 1,
          sort: 'createdAt',
          pagination: false,
        })

        const yourTable = tables.docs.find(t => {
          return (t.members as Array<{ id: string }>)?.some(m => m.id === user.id)
        })

        const formattedTables = tables.docs
          .filter(
            t => (t.members as unknown[]).length > 0 || (isAdmin(user) && bookingSettings.isOpen),
          )
          .map(t => ({
            id: t.id,
            joinCode: t.joinCode,
            locked: t.locked,
            isOwner: typeof t.owner === 'string' ? t.owner === user.id : t.owner?.id === user.id,
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
                isOwner:
                  typeof yourTable.owner === 'string'
                    ? yourTable.owner === user.id
                    : yourTable.owner?.id === user.id,
                memberCount: yourTable.memberCount,
              }
            : null,
          settings: {
            isOpen: bookingSettings.isOpen,
            maxTables: bookingSettings.maxTables,
            seatsPerTable: bookingSettings.seatsPerTable,
            eventName: bookingSettings.eventName,
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

        const bookingSettings = await payload.findGlobal({ slug: 'booking' })
        const seatCount = bookingSettings.seatsPerTable || 10

        const filledSeats: Array<string | null> = Array(seatCount).fill(null)
        const seatPositions = table.seatPositions as
          | Array<{ seatIndex: number; name: string }>
          | undefined
        if (seatPositions) {
          for (const s of seatPositions) {
            if (s.seatIndex >= 0 && s.seatIndex < seatCount) {
              filledSeats[s.seatIndex] = s.name
            }
          }
        }

        // members are ObjectId strings at depth 0, need to fetch their names
        const memberIds = (Array.isArray(table.members) ? table.members : []) as string[]
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

        return res.json({
          seats: filledSeats,
          members,
          yourTable: memberIds.some(id => id === user.id),
          joinCode: table.joinCode,
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
