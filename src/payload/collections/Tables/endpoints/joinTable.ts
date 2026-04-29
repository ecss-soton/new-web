import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { getTableByJoinCode } from './getTableByJoinCode'

export const joinTable: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const bookingSettings = await payload.findGlobal({ slug: 'booking' })

  if (!bookingSettings.isOpen && !isAdmin(user)) {
    return res.status(403).json({ error: 'Table booking is currently closed' })
  }

  const existingTables = await payload.find({
    collection: 'tables',
    where: {
      members: { contains: user.id },
    },
    pagination: false,
    depth: 0,
  })

  if (existingTables.totalDocs > 0) {
    return res.status(400).json({
      error: 'You are already in a table. Leave your current table first.',
      existingTable: existingTables.docs[0].joinCode,
    })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  if (table.locked && !isAdmin(user)) {
    return res.status(403).json({ error: 'This table is locked' })
  }

  const ticketHolder = await payload.find({
    collection: 'ticket-holders',
    where: {
      sotonId: { equals: user.username },
    },
    limit: 1,
    depth: 0,
  })

  if (ticketHolder.totalDocs === 0 && !isAdmin(user)) {
    return res.status(403).json({
      error: 'You are not on the guest list for this event.',
    })
  }

  const plusOneCount = (ticketHolder.docs[0]?.plusOneCount as number) || 0

  const seatsPerTable = bookingSettings.seatsPerTable || 10
  const newMemberUsage = 1 + plusOneCount
  const currentUsage = (table.memberCount as number) || 0

  if (currentUsage + newMemberUsage > seatsPerTable && !isAdmin(user)) {
    return res.status(400).json({
      error: `Table is full. You need ${newMemberUsage} seat(s) but only ${
        seatsPerTable - currentUsage
      } are available.`,
    })
  }

  const members = (Array.isArray(table.members) ? [...table.members] : []) as string[]
  members.push(user.id)

  await payload.update({
    collection: 'tables',
    id: table.id,
    data: {
      members,
      memberCount: currentUsage + newMemberUsage,
    },
  })

  return res.json({ success: true, table: { id: table.id, joinCode: table.joinCode } })
}
