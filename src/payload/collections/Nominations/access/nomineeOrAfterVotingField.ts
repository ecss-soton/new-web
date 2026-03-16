import type { FieldAccess } from 'payload/types'

import type { Nomination } from '../../../payload-types'
import { nomineeOrAfterVoting } from './nomineeOrAfterVoting'

export const nomineeOrAfterVotingField: FieldAccess<Nomination> = async ({ req, doc }) => {
  if (!doc) {
    return false
  }

  const access = await nomineeOrAfterVoting({ req })

  if (typeof access === 'boolean') {
    return access
  }

  const matchingNomination = await req.payload.find({
    collection: 'nominations',
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          id: {
            equals: doc.id,
          },
        },
        access,
      ],
    },
  })

  return matchingNomination.totalDocs > 0
}
