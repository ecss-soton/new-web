import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { getTableByJoinCode } from './getTableByJoinCode'

export const leaveTable: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const bookingSettings = await payload.findGlobal({ slug: 'booking' })

  if (!bookingSettings.isOpen && !isAdmin(user)) {
    return res.status(403).json({ error: 'Table booking is currently closed' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const members = (Array.isArray(table.members) ? [...table.members] : []) as string[]
  const memberIndex = members.findIndex(m => {
    return typeof m === 'string' ? m === user.id : m === (user.id as string)
  })

  if (memberIndex === -1) {
    return res.status(400).json({ error: 'You are not a member of this table' })
  }

  members.splice(memberIndex, 1)

  const ticketHolder = await payload.find({
    collection: 'ticket-holders',
    where: {
      sotonId: { equals: user.username },
    },
    limit: 1,
    depth: 0,
  })

  const plusOneCount = (ticketHolder.docs[0]?.plusOneCount as number) || 0
  const leavingUsage = 1 + plusOneCount
  const currentMemberCount = (table.memberCount as number) || 0
  const newMemberCount = Math.max(0, currentMemberCount - leavingUsage)

  const seatPositions = Array.isArray(table.seatPositions)
    ? [...(table.seatPositions as Array<{ seatIndex: number; name: string }>)]
    : []

  const userName = user.name || user.username || ''
  const filteredSeats = seatPositions.filter(
    s => s.name !== userName && !s.name.startsWith(`${userName}'s +`),
  )

  if (members.length === 0) {
    await payload.delete({
      collection: 'tables',
      id: table.id,
    })
  } else {
    const updateData: Record<string, unknown> = {
      members,
      memberCount: newMemberCount,
    }

    if (filteredSeats.length !== seatPositions.length) {
      updateData.seatPositions = filteredSeats
    }

    if (
      typeof table.owner === 'string'
        ? table.owner === user.id
        : (table.owner as { id: string })?.id === user.id
    ) {
      updateData.owner = members[0]
    }

    await payload.update({
      collection: 'tables',
      id: table.id,
      data: updateData,
    })
  }

  return res.json({ success: true })
}
