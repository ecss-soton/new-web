import type { Payload } from 'payload'

import { nominationDisplayName, type NominationLike } from '../../utilities/nominationLabel'
import type { Election } from '../payload-types'
import { getArrayID, getID } from './getID'

export const RON_ID = 'ron'

export interface StandingsInputVote {
  username?: string | null
  position: string | { id: string }
  RONPosition?: number | null
  preference?: Array<string | { id: string }> | null
}

export interface StandingsInputNomination extends NominationLike {
  id: string
  position: string | { id: string }
  droppedOut?: boolean | null
}

export interface StandingsInputPosition {
  id: string
  name: string
  importance?: number | null
}

export interface StandingsRow {
  id: string
  label: string
  count: number
  percent: number
  isRon: boolean
  droppedOut: boolean
}

export interface PositionStandings {
  id: string
  name: string
  importance: number
  ballots: number
  blankFirstPreferences: number
  rows: StandingsRow[]
}

export interface ElectionStandings {
  election: {
    id: string
    name: string
    votingStart: string
    votingEnd: string
  }
  ballots: number
  voters: number
  positions: PositionStandings[]
}

const firstPreference = (vote: StandingsInputVote): string | null => {
  if (vote.RONPosition === 0) return RON_ID

  const preferences = getArrayID(vote.preference ?? [])
  if (preferences.length > 0) return preferences[0]

  if (typeof vote.RONPosition === 'number') return RON_ID

  return null
}

/**
 * Live first-preference standings. This is deliberately not an STV count: the
 * official result is produced by `countVotesForPosition` after voting closes.
 */
export const computeFirstPreferenceStandings = ({
  votes,
  nominations,
  positions,
}: {
  votes: StandingsInputVote[]
  nominations: StandingsInputNomination[]
  positions: StandingsInputPosition[]
}): Omit<ElectionStandings, 'election'> => {
  const orderedPositions = [...positions].sort(
    (a, b) => (a.importance ?? Number.MAX_SAFE_INTEGER) - (b.importance ?? Number.MAX_SAFE_INTEGER),
  )

  const voters = new Set<string>()
  for (const vote of votes) {
    const username = vote.username?.trim()
    if (username) voters.add(username)
  }

  const positionStandings = orderedPositions.map(position => {
    const positionVotes = votes.filter(vote => getID(vote.position) === position.id)
    const positionNominations = nominations.filter(
      nomination => getID(nomination.position) === position.id,
    )
    const counts = new Map<string, number>()
    let blankFirstPreferences = 0

    for (const vote of positionVotes) {
      const first = firstPreference(vote)
      if (!first) {
        blankFirstPreferences++
        continue
      }

      counts.set(first, (counts.get(first) ?? 0) + 1)
    }

    const percentFor = (count: number): number =>
      positionVotes.length > 0 ? Math.round((count / positionVotes.length) * 1000) / 10 : 0

    const rows: StandingsRow[] = positionNominations.map(nomination => {
      const count = counts.get(nomination.id) ?? 0

      return {
        id: nomination.id,
        label: nominationDisplayName(nomination),
        count,
        percent: percentFor(count),
        isRon: false,
        droppedOut: Boolean(nomination.droppedOut),
      }
    })

    // A vote can still reference a nomination removed since the ballot was cast.
    for (const [id, count] of counts) {
      if (id === RON_ID) continue
      if (rows.some(row => row.id === id)) continue

      rows.push({
        id,
        label: 'Unknown',
        count,
        percent: percentFor(count),
        isRon: false,
        droppedOut: false,
      })
    }

    const visibleRows = rows.filter(row => !row.droppedOut || row.count > 0)
    const ronCount = counts.get(RON_ID) ?? 0

    visibleRows.push({
      id: RON_ID,
      label: 'RON',
      count: ronCount,
      percent: percentFor(ronCount),
      isRon: true,
      droppedOut: false,
    })

    visibleRows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

    return {
      id: position.id,
      name: position.name,
      importance: position.importance ?? 0,
      ballots: positionVotes.length,
      blankFirstPreferences,
      rows: visibleRows,
    }
  })

  return {
    ballots: votes.length,
    voters: voters.size,
    positions: positionStandings,
  }
}

export const getElectionStandings = async (
  payload: Payload,
  electionId: string,
): Promise<ElectionStandings | null> => {
  const election = (await payload.findByID({
    collection: 'elections',
    id: electionId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
  })) as Election | null | undefined

  if (!election) return null

  const positionIds = getArrayID(election.positions)

  const [positionsResult, votesResult, nominationsResult] = await Promise.all([
    payload.find({
      collection: 'positions',
      where: { id: { in: positionIds } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'votes',
      where: { election: { equals: electionId } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'nominations',
      where: { election: { equals: electionId } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const standings = computeFirstPreferenceStandings({
    votes: votesResult.docs.map(vote => ({
      username: vote.username,
      position: getID(vote.position),
      RONPosition: vote.RONPosition,
      preference: getArrayID(vote.preference ?? []),
    })),
    nominations: nominationsResult.docs.map(nomination => ({
      id: nomination.id,
      position: getID(nomination.position),
      nickname: nomination.nickname,
      droppedOut: nomination.droppedOut,
      populatedNominees: nomination.populatedNominees,
    })),
    positions: positionsResult.docs.map(position => ({
      id: position.id,
      name: position.name,
      importance: position.importance,
    })),
  })

  return {
    election: {
      id: election.id,
      name: election.name,
      votingStart: election.votingStart,
      votingEnd: election.votingEnd,
    },
    ...standings,
  }
}
