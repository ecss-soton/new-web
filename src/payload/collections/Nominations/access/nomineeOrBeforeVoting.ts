import type { Access } from 'payload/types'

import type { Nomination } from '../../../payload-types'
import { checkRole } from '../../Users/checkRole'

export const nomineeOrBeforeVoting: Access<Nomination> = async ({ req: { user, payload } }) => {
  if (!user) return false

  // if (checkRole(['admin'], user)) {
  //   return true
  // }

  const nowISO = new Date().toISOString()

  try {
    const upcomingElections = await payload.find({
      collection: 'elections',
      depth: 0,
      pagination: false,
      where: {
        votingStart: {
          less_than: nowISO,
        },
      },
    })

    const upcomingElectionIDs = upcomingElections.docs.map(election => election.id).filter(Boolean)

    if (upcomingElectionIDs.length === 0) {
      return {
        nominees: {
          contains: user.id,
        },
      }
    }

    return {
      or: [
        {
          nominees: {
            contains: user.id,
          },
        },
        {
          election: {
            in: upcomingElectionIDs,
          },
        },
      ],
    }
  } catch {
    // Fail closed to nominee-only access if election lookup fails.
    // eslint-disable-next-line no-console
    return {
      nominees: {
        contains: user.id,
      },
    }
  }
}
