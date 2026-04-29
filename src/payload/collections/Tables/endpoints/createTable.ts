import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'

export const createTable: PayloadHandler = async (req, res) => {
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

  const tableCount = await payload.find({
    collection: 'tables',
    pagination: false,
    depth: 0,
  })

  const activeTables = tableCount.docs.filter(
    t => Array.isArray(t.members) && t.members.length > 0,
  ).length

  const maxTables = bookingSettings.maxTables || 17

  if (activeTables >= maxTables && !isAdmin(user)) {
    return res.status(400).json({
      error: `Maximum number of tables (${maxTables}) has been reached`,
    })
  }

  const totalSeatUsage = 1 + plusOneCount

  const table = await payload.create({
    collection: 'tables',
    data: {
      joinCode: '', // filled by beforeChange hook
      owner: user.id,
      locked: false,
      members: [user.id],
      memberCount: totalSeatUsage,
      seatPositions: [{ seatIndex: 0, name: user.name || user.username || 'You' }],
    },
  })

  return res.json({ success: true, table: { id: table.id, joinCode: table.joinCode } })
}
