import { scheduledJobs, scheduleJob } from 'node-schedule'
import payload from 'payload'
import type { FieldHook } from 'payload/types'

export async function checkNominationsForElection(electionID: string): Promise<void> {
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
  })

  await Promise.all(
    nominations.docs
      .filter(nomination => {
        const supporters = nomination.supporters.filter(s => !nomination.nominees.includes(s))
        return !supporters || supporters.length < 2
      })
      .map(nomination => {
        payload.logger.info(
          `Removing nomination with id: ${nomination.id} due to lack of supporters`,
        )
        return payload.update({
          collection: 'nominations',
          id: nomination.id,
          data: {
            droppedOut: true,
          },
        })
      }),
  )
}

export function scheduleNominationCheck(id: string, votingStart: string): void {
  const date = new Date(Date.parse(votingStart))
  // Delay by 1 minute to ensure nominations are fully closed and avoid any "exactly at" issues
  date.setMinutes(date.getMinutes() + 1)
  const prefix = 'nominations-votingStart-'
  const previousJob = scheduledJobs[prefix + id]
  if (previousJob) {
    previousJob.cancel(false)
  }

  if (date.getTime() > new Date().getTime()) {
    scheduleJob(prefix + id, date, checkNominationsForElection.bind(null, id))
  }
}

export const checkNominations: FieldHook = ({ data, originalDoc }) => {
  scheduleNominationCheck(data.id ?? originalDoc.id, data.votingStart)
}
