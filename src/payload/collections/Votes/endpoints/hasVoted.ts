import type { PayloadHandler } from 'payload/config'

export const hasVoted: PayloadHandler = async (req, res): Promise<void> => {
  const { electionId, positionId } = req.params
  const { user, payload } = req

  if (!user?.username) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const vote = await payload.find({
    collection: 'votes',
    where: {
      and: [
        { election: { equals: electionId } },
        { position: { equals: positionId } },
        { username: { equals: user.username } },
      ],
    },
    depth: 0,
  })

  res.json({ hasVoted: vote.totalDocs > 0 })
}
