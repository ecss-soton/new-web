import { FieldHook } from 'payload/types';
import payload from 'payload';
import { scheduledJobs, scheduleJob } from 'node-schedule';

export async function checkNominationsForElection(electionID: string) {
  const nominations = await payload.find({
    collection: 'nominations',
    pagination: false,
    depth: 0,
    where: {
      and: [
        {
          election: {
            equals: electionID,
          },
        },
        {
          droppedOut: {
            not_equals: true,
          },
        },
      ],
    },
  });

  await Promise.all(nominations.docs.filter((nomination) => {
    const supporters = nomination.supporters.filter((s) => !nomination.nominees.includes(s));
    return !supporters || supporters.length < 2;
  }).map((nomination) => {
    payload.logger.info(`Removing nomination with id: ${nomination.id} due to lack of supporters`);
    return payload.update({
      collection: 'nominations',
      id: nomination.id,
      data: {
        droppedOut: true,
      },
    });
  }));
}

export function scheduleNominationCheck(id: string, votingStart: string) {
  const date = new Date(Date.parse(votingStart));
  const prefix = 'nominations-votingStart-';
  const previousJob = scheduledJobs[prefix + id];
  if (previousJob) {
    previousJob.cancel(false);
  }

  if (date.getTime() > new Date().getTime()) {
    scheduleJob(prefix + id, date, checkNominationsForElection.bind(null, id));
  }
}

export const checkNominations: FieldHook = ({ data, originalDoc }) => {
  scheduleNominationCheck(data.id ?? originalDoc.id, data.votingStart);
};
