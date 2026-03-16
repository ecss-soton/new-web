import type { FieldAccess } from 'payload/types'

import type { Nomination } from '../../../payload-types'
import { nomineeOrBeforeVoting } from './nomineeOrBeforeVoting'

export const nomineeOrBeforeVotingField: FieldAccess<Nomination> = async ({ req, doc }) => {
  if (!doc) {
    return false
  }

  const access = await nomineeOrBeforeVoting({ req })

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
