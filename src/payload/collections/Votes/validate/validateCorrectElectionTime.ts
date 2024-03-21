import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import type { Election } from '../../../payload-types'
import { getID } from '../../../utilities/getID'

export const validateCorrectElectionTime: Validate = async (election, args) => {
  if (!election) {
    return 'Vote must have an election'
  }
  const electionId = getID(election)

  if (args.payload) {
    const result: Election = await args.payload.findByID({
      collection: 'elections',
      depth: 0,
      pagination: false,
      id: electionId,
    })

    const votingStart = Date.parse(result.votingStart)
    const votingEnd = Date.parse(result.votingEnd)
    const now = new Date().getTime()
    return now >= votingStart && now <= votingEnd ? true : 'Voting has not started or has ended'
  }

  return relationship(election, args)
}
