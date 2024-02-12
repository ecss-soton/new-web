import type { PayloadHandler } from 'payload/config'

import { getID } from '../../../utilities/getID'
import { countVotesForPosition } from '../../Elections/hooks/checkVotes'
import { checkRole } from '../../Users/checkRole'

export const recountVotes: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user || !checkRole(['admin'], user)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const electionResult = await payload.findByID({
    collection: 'electionResults',
    id: req.params.id,
    depth: 0,
  })

  if (!electionResult) {
    res.status(404).json({ error: 'Unknown election result' })
    return
  }

  try {
    await countVotesForPosition(getID(electionResult.election), getID(electionResult.position))

    res.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(message)

    res.status(503).json({ error: message })
  }
}
