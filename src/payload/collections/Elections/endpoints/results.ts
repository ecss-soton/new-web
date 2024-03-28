import type { PayloadHandler } from 'payload/config'

import { checkRole } from '../../Users/checkRole'

export const electionResults: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user || !checkRole(['admin'], user)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const electionResult = await payload.find({
    collection: 'electionResults',
    depth: 2,
    where: {
      election: {
        equals: req.params.id,
      },
    },
    pagination: false,
  })

  if (!electionResult || electionResult.totalDocs === 0) {
    res
      .status(404)
      .json({ error: 'Unknown election', electionFinished: electionResult.totalDocs !== 0 })
    return
  }

  const votes = await payload.find({
    collection: 'votes',
    depth: 0,
    where: {
      election: {
        equals: req.params.id,
      },
    },
    pagination: false,
  })

  const totalVoters = [...new Set(votes.docs.map(vote => vote.username))].length

  try {
    res.json({
      success: true,
      totalVotes: votes.totalDocs,
      totalVoters: totalVoters,
      electionResult: electionResult.docs,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(message)

    res.status(503).json({ error: message })
  }
}
