import type { FieldAccess } from 'payload/types'

import type { Election, Nomination } from '../../../payload-types'
import { checkRole } from '../../Users/checkRole'

export const beforeVoting: FieldAccess<Nomination> = async ({ req, doc, data }) => {
  if (req.user && checkRole(['admin'], req.user)) {
    return true
  }

  // Don't think doc.election will ever not be a string, but just in case
  const election = typeof doc.election === 'string' ? doc.election : doc.election.id

  const result = await req.payload.findByID({
    collection: 'elections',
    id: election,
    depth: 0,
  })

  const votingStart = Date.parse(result.votingStart)
  const now = new Date().getTime()

  return now < votingStart
}
