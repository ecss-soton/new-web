import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import { getElectionStandings } from '../../../utilities/electionStandings'

/**
 * Admin-only live first-preference standings for an election.
 *
 * This is a read-only snapshot for admins while voting is in progress; the
 * official result is still the STV count produced after voting closes. No voter
 * identities or individual ballots are returned.
 */
export const electionStandings: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!isAdmin(user)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const standings = await getElectionStandings(payload, req.params.id)

    if (!standings) {
      res.status(404).json({ error: 'Unknown election' })
      return
    }

    res.setHeader('Cache-Control', 'no-store')
    res.json({ success: true, ...standings })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(
      `Failed to compute live standings for election ${req.params.id}: ${message}`,
    )

    res.status(503).json({ error: message })
  }
}
