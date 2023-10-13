import { Payload } from 'payload';
import { scheduleNominationCheck } from '../collections/Elections/hooks/checkNominations';
import { scheduleVotesCount } from '../collections/Elections/hooks/checkVotes';

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

export default async function restartJobs(payload: Payload) {
  await restartNominationCheck(payload);
  await restartVotingCount(payload);
}
