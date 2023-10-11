import { FieldHook } from 'payload/types';
import payload from 'payload';
import { scheduledJobs, scheduleJob } from 'node-schedule';

export async function checkNominationsForElection(electionID: string) {
  console.log('djfkljfdsailojfdsalk');
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

  for (let i = 0; i < nominations.docs.length; i += 1) {
    const nomination = nominations.docs[i];
    const supporters = nomination.supporters.filter((s) => !nomination.nominees.includes(s));
    if (!supporters || supporters.length < 2) {
      payload.logger.info(`Removing nomination with id: ${nomination.id} due to lack of supporters`);
      // Rare enough for us not to care about using Promise.all
      // eslint-disable-next-line no-await-in-loop
      await payload.update({
        collection: 'nominations',
        id: nomination.id,
        data: {
          droppedOut: true,
        },
      });
    }
  }
}

export function scheduleNominationCheck(id: string, votingStart: string) {
  const date = new Date(Date.parse(votingStart));
  const prefix = 'nominations-votingStart-';
  const previousJob = scheduledJobs[prefix + id];
  if (previousJob) {
    previousJob.cancel(false);
  }

  // scheduleJob({ hour: 21, minute: 17 }, () => {
  //   console.log('Time for tea!');
  // });
  // scheduleJob(prefix + id, date, checkNominationsForElection.bind(null, id));
  // scheduleJob(prefix + id, date, aab.bind(null, id));
  scheduleJob(prefix + id, date, checkNominationsForElection.bind(null, id));
}

export const checkNominations: FieldHook = ({ data, originalDoc }) => {
  scheduleNominationCheck(data.id ?? originalDoc.id, data.votingStart);
};
