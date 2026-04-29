import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { getTableByJoinCode } from './getTableByJoinCode'

export const manageSeats: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user) {
    return res.status(401).json({ error: 'Login required' })
  }

  const table = await getTableByJoinCode(payload, req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const isMember =
    Array.isArray(table.members) &&
    table.members.some((m: string | { id: string }) => {
      return typeof m === 'string' ? m === user.id : m.id === user.id
    })

  if (!isMember && !isAdmin(user)) {
    return res.status(403).json({ error: 'Only table members can manage seats' })
  }

  const { seatPositions } = req.body as {
    seatPositions?: Array<{ seatIndex: number; name: string }>
  }

  if (!Array.isArray(seatPositions)) {
    return res.status(400).json({ error: 'seatPositions must be an array' })
  }

  for (const s of seatPositions) {
    if (typeof s.seatIndex !== 'number' || typeof s.name !== 'string') {
      return res
        .status(400)
        .json({ error: 'Each seat must have a seatIndex (number) and name (string)' })
    }
  }

  await payload.update({
    collection: 'tables',
    id: table.id,
    data: {
      seatPositions,
    },
  })

  return res.json({ success: true })
}
