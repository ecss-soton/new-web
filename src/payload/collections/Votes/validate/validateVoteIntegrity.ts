import type { Validate } from 'payload/types'

import { getArrayID, getID } from '../../../utilities/getID'

export const validateVoteIntegrity: Validate = async (electionValue, args) => {
  if (!electionValue || !args.data?.position || !args.payload) return true

  const electionId = getID(electionValue)
  const positionId = getID(args.data.position)

  try {
    const election = await args.payload.findByID({
      collection: 'elections',
      id: electionId,
      depth: 0,
    })

    if (!getArrayID(election.positions || []).includes(positionId)) {
      return 'The selected position does not belong to this election'
    }

    const preferenceIds = getArrayID(args.data.preference || [])
    for (const preferenceId of preferenceIds) {
      const nomination = await args.payload.findByID({
        collection: 'nominations',
        id: preferenceId,
        depth: 0,
      })

      if (
        getID(nomination.election) !== electionId ||
        getID(nomination.position) !== positionId ||
        nomination.droppedOut
      ) {
        return 'Each preference must be an active nomination for the selected election and position'
      }
    }
  } catch {
    return 'The selected election, position, or nomination could not be verified'
  }

  return true
}
