import { readableToString } from '@rauschma/stringio'
import { spawn } from 'child_process'
import jsSHA from 'jssha'
import { scheduledJobs, scheduleJob } from 'node-schedule'
import payload from 'payload'
import type { FieldHook } from 'payload/types'

import type { ElectionResult, Nomination, Vote } from '../../../payload-types'

const ron = 'ron'

function parseVoteResult(
  electionID: string,
  positionID: string,
  resultFile: string,
  withdrawnNominees: string[],
): Partial<ElectionResult> {
  const roundsRegExp = /Round \d+:/gm
  const actionRegExp = /Action: (Defeat|Elect)[^:]*: (\w+)/gm
  const resultRegExp = /(Elected|Hopeful|Defeated):  ?([\w, ]+) \(([\d/]+)\)/gm

  const rounds = []

  for (const round of resultFile.split(roundsRegExp).filter((_, i) => i !== 0)) {
    const actions = round.split(actionRegExp)
    const outcome = actions[1]
    const nomination = actions[2]

    let votes = []

    for (const matches of actions[3].matchAll(resultRegExp)) {
      const nominationOutcome = matches[1]
      const nominations = matches[2].split(', ').filter(n => !withdrawnNominees.includes(n))

      const vote = matches[3].split('/')
      let voteCount = 0
      if (vote.length === 1) {
        voteCount = Number.parseFloat(vote[0])
      } else {
        voteCount = Number.parseInt(vote[0], 10) / Number.parseInt(vote[1], 10)
      }
      votes = votes.concat(
        nominations.map(n => ({
          count: voteCount,
          state: nominationOutcome,
          nomination: n === ron ? undefined : n,
        })),
      )
    }

    rounds.push({
      outcome,
      nomination: nomination === ron ? undefined : nomination,
      votes,
    })
  }

  if (rounds.length === 0) {
    payload.logger.error(`No rounds found for election ${electionID} and position ${positionID}`)
  }

  return {
    election: electionID,
    position: positionID,
    electedNominee: rounds[rounds.length - 1].nomination,
    roundTranscript: resultFile,
    rounds,
  }
}

function generateBallotFile(votes: Vote[], nominees: Nomination[]): string {
  const ballots = {}

  for (const vote of votes) {
    const preferences = (vote.preference ?? []).map(p => `u${p}`)
    if (vote.RONPosition !== null && vote.RONPosition !== undefined) {
      preferences.splice(vote.RONPosition, 0, ron)
    }
    const prefString = preferences.join(' ')
    ballots[prefString] = (ballots[prefString] ?? 0) + 1
  }

  const names = nominees.map(n => n.id).concat([ron])
  const nicknames = nominees.map(n => `u${n.id}`).concat([ron])
  const withdrawn = nominees.filter(n => n.droppedOut).map(n => `u${n.id}`)

  let ballotFile = `${nominees.length + 1} 1\n[nick ${nicknames.join(' ')}]`

  if (withdrawn.length > 0) {
    ballotFile += `\n[withdrawn ${withdrawn.join(' ')}`
  }

  ballotFile += `\n${Object.keys(ballots)
    .map(pref => `${ballots[pref]} ${pref} 0`)
    .join('\n')}`

  ballotFile += '\n0'

  ballotFile += `\n${names.map(name => `"${name}"`).join('\n')}`

  ballotFile += '\n"ECSS Election"\n'

  return ballotFile
}

async function updateElectionResult(
  electionResult: Omit<ElectionResult, 'id' | 'updatedAt' | 'createdAt' | 'sizes'>,
): Promise<void> {
  const electionResults = await payload.find({
    collection: 'electionResults',
    depth: 0,
    where: {
      and: [
        {
          election: {
            equals: electionResult.election,
          },
          position: {
            equals: electionResult.position,
          },
        },
      ],
    },
  })

  if (electionResults.totalDocs > 1) {
    payload.logger.error('Found more than one election result for a single position.')
  } else if (electionResults.totalDocs === 1) {
    await payload.update({
      collection: 'electionResults',
      id: electionResults.docs[0].id,
      data: electionResult,
    })
  } else {
    await payload.create({
      collection: 'electionResults',
      data: electionResult,
    })
  }
}

function renameNominees(file: string, nominations: Nomination[]): string {
  for (const nomination of nominations) {
    const names = nomination.populatedNominees.map(n => n.name).join(' & ')
    const regex = new RegExp(`\\b${nomination.id}\\b`, 'g')
    file = file.replaceAll(regex, names)
  }

  return file
}

export async function countVotesForPosition(electionID: string, positionID: string): Promise<void> {
  payload.logger.info(`Counting votes for position ${positionID} in election ${electionID}.`)

  const votes = await payload.find({
    collection: 'votes',
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
          position: {
            equals: positionID,
          },
        },
      ],
    },
  })

  const nominees = await payload.find({
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
          position: {
            equals: positionID,
          },
        },
      ],
    },
  })

  if (nominees.docs.length === 0) {
    payload.logger.warn(`No nominees found for position ${positionID} in election ${electionID}.`)
    return
  }

  // Keep same tie order in case this function is re-run
  const shuffle: Nomination[] = nominees.docs
    .map(value => ({
      value,
      // eslint-disable-next-line new-cap
      sort: new jsSHA('SHA3-256', 'TEXT', { encoding: 'UTF8' })
        .update(electionID)
        .update(positionID)
        .update(value.id)
        .getHash('HEX'),
    }))
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ value }) => value)

  payload.logger.info(
    `Generating ballot file for position ${positionID} in election ${electionID}.`,
  )

  const ballotFile = generateBallotFile(votes.docs, shuffle)

  const stv = spawn('stv-rs', ['--arithmetic', 'exact', 'meek'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  stv.stdin.write(ballotFile)
  stv.stdin.end()
  const resultFile = await readableToString(stv.stdout)

  payload.logger.info(`Parsing result for position ${positionID} in election ${electionID}.`)
  const result = parseVoteResult(
    electionID,
    positionID,
    resultFile,
    shuffle.filter(n => n.droppedOut).map(n => n.id),
  )
  result.roundTranscript = renameNominees(result.roundTranscript, shuffle)
  result.ballot = renameNominees(ballotFile, shuffle)
  payload.logger.info(`Updating result for position ${positionID} in election ${electionID}.`)
  await updateElectionResult(
    result as Omit<ElectionResult, 'id' | 'updatedAt' | 'createdAt' | 'sizes'>,
  )
  payload.logger.info(`Updated result for position ${positionID} in election ${electionID}.`)
}

export function scheduleVotesCount(
  electionID: string,
  positionID: string,
  votingEnd: string,
): void {
  const date = new Date(Date.parse(votingEnd))
  const prefix = 'nominations-votingEnd-'
  const previousJob = scheduledJobs[`nominations-votingEnd-${electionID}-${positionID}`]
  if (previousJob) {
    previousJob.cancel(false)
  }

  if (date.getTime() > new Date().getTime()) {
    const func = countVotesForPosition.bind(null, electionID, positionID)
    scheduleJob(prefix + electionID, date, func)
  }
}

export const countVotes: FieldHook = ({ data, originalDoc }) => {
  for (const position of data.positions) {
    scheduleVotesCount(data.id ?? originalDoc.id, position, data.votingEnd)
  }
}
