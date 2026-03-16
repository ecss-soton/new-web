import type { PayloadHandler } from 'payload/config'

import { checkRole } from '../checkRole'

export const countSusuMembers: PayloadHandler = async (req, res): Promise<void> => {
  try {
    const users = await req.payload.find({
      collection: 'users',
      depth: 0,
      pagination: false,
    })

    const susuCount = users.docs.filter(user => checkRole(['susu'], user)).length

    res.json({ susuCount })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to count susu members' })
  }
}
