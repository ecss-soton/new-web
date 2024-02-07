import { Payload } from 'payload';
import { scheduleJob } from 'node-schedule';
import { scheduleNominationCheck } from '../collections/Elections/hooks/checkNominations';
import { scheduleVotesCount } from '../collections/Elections/hooks/checkVotes';
import { checkOrders } from '../collections/Orders/scheduled/checkOrders';

async function restartNominationCheck(payload: Payload) {
  const elections = await payload.find({
    collection: 'elections',
    pagination: false,
    depth: 0,
    where: {
      votingStart: {
        greater_than: new Date().toISOString(),
      },
    },
  });

  for (const election of elections.docs) {
    scheduleNominationCheck(election.id, election.votingStart);
  }
}

async function restartVotingCount(payload: Payload) {
  const elections = await payload.find({
    collection: 'elections',
    pagination: false,
    depth: 0,
    where: {
      votingEnd: {
        greater_than: new Date().toISOString(),
      },
    },
  });

  for (const election of elections.docs) {
    for (const position of election.positions) {
      scheduleVotesCount(election.id, position, election.votingEnd);
    }
  }
}

async function startOrderCheck(payload: Payload) {
  const func = checkOrders.bind(null, payload);
  // Execute every minute.
  scheduleJob('order-check', '*/1 * * * *', func);
}

export default async function restartJobs(payload: Payload) {
  await startOrderCheck(payload);
  await restartNominationCheck(payload);
  await restartVotingCount(payload);
}
