import { Payload } from 'payload';
import { scheduleNominationCheck } from '../collections/Elections/hooks/checkNominations';

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

  for (let i = 0; i < elections.docs.length; i += 1) {
    const election = elections.docs[i];
    scheduleNominationCheck(election.id, election.votingStart);
  }
}


export default async function restartJobs(payload: Payload) {
  await restartNominationCheck(payload);
}
