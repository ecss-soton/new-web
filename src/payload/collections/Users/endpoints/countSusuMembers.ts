import type { PayloadHandler } from 'payload/config'

export const countSusuMembers: PayloadHandler = async (req, res): Promise<void> => {
  try {
    const users = await req.payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      where: {
        roles: {
          contains: 'susu',
        },
      },
    })

    res.json({ susuCount: users.totalDocs })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to count susu members' })
  }
}
