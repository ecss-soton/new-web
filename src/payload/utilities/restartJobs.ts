import { scheduleJob } from 'node-schedule'
import type { Payload } from 'payload'

import { scheduleNominationCheck } from '../collections/Elections/hooks/checkNominations'
import { scheduleVotesCount } from '../collections/Elections/hooks/checkVotes'
import { checkOrders } from '../collections/Orders/scheduled/checkOrders'
import { getID } from './getID'

async function restartNominationCheck(payload: Payload): Promise<void> {
  const elections = await payload.find({
    collection: 'elections',
    pagination: false,
    depth: 0,
    where: {
      votingStart: {
        greater_than: new Date().toISOString(),
      },
    },
  })

  for (const election of elections.docs) {
    scheduleNominationCheck(election.id, election.votingStart)
  }
}

async function restartVotingCount(payload: Payload): Promise<void> {
  const elections = await payload.find({
    collection: 'elections',
    pagination: false,
    depth: 0,
    where: {
      votingEnd: {
        greater_than: new Date().toISOString(),
      },
    },
  })

  for (const election of elections.docs) {
    for (const position of election.positions) {
      scheduleVotesCount(election.id, getID(position), election.votingEnd)
    }
  }
}

async function startOrderCheck(payload: Payload): Promise<void> {
  const func = checkOrders.bind(null, payload)
  // Execute every minute.
  scheduleJob('order-check', '*/1 * * * *', func)
}

export default async function restartJobs(payload: Payload): Promise<void> {
  await startOrderCheck(payload)
  await restartNominationCheck(payload)
  await restartVotingCount(payload)
}
