import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Payload } from 'payload'

import {
  computeFirstPreferenceStandings,
  getElectionStandings,
  RON_ID,
  type StandingsInputNomination,
  type StandingsInputPosition,
  type StandingsInputVote,
} from './electionStandings'

const positions: StandingsInputPosition[] = [
  { id: 'p2', name: 'Post-Graduate Rep', importance: 2 },
  { id: 'p1', name: 'Freshers Rep', importance: 1 },
]

const nominations: StandingsInputNomination[] = [
  {
    id: 'n1',
    position: 'p1',
    nickname: 'Oscar',
    populatedNominees: [{ name: 'Oscar Sanderson' }],
  },
  {
    id: 'n2',
    position: 'p1',
    nickname: 'Rasha',
    populatedNominees: [{ name: 'Rasha Baeigh' }],
  },
  {
    id: 'n3',
    position: 'p1',
    nickname: 'Noah',
    populatedNominees: [{ name: 'Noah Major' }],
  },
  {
    id: 'n4',
    position: 'p1',
    nickname: 'Dropped',
    droppedOut: true,
    populatedNominees: [{ name: 'Dropped Person' }],
  },
  {
    id: 'n5',
    position: 'p2',
    nickname: 'Casper',
    populatedNominees: [{ name: 'Casper Dancy' }],
  },
  {
    id: 'n6',
    position: 'p2',
    nickname: 'Marmik',
    populatedNominees: [{ name: 'Marmik Joshi' }],
  },
]

const votes: StandingsInputVote[] = [
  { username: 'a', position: 'p1', RONPosition: 2, preference: ['n1', 'n2'] },
  // RON is the first preference.
  { username: 'b', position: 'p1', RONPosition: 0, preference: ['n2'] },
  { username: 'c', position: 'p1', RONPosition: 1, preference: ['n1'] },
  // Blank ballot: no preference and no RON.
  { username: 'd', position: 'p1', RONPosition: null, preference: [] },
  // A dropped-out candidate can still have first preferences.
  { username: 'e', position: 'p1', RONPosition: 1, preference: ['n4'] },
  { username: 'f', position: 'p1', RONPosition: 2, preference: ['n2', 'n1'] },
  { username: 'a', position: 'p2', RONPosition: 2, preference: ['n5', 'n6'] },
  { username: 'g', position: 'p2', RONPosition: null, preference: ['n5'] },
]

const rowByLabel = <TRow extends { label: string }>(
  rows: TRow[],
  label: string,
): TRow | undefined => rows.find(row => row.label === label)

test('computes first preferences per position, including RON, blanks and dropped-out candidates', () => {
  const result = computeFirstPreferenceStandings({ votes, nominations, positions })

  assert.equal(result.ballots, 8)
  assert.equal(result.voters, 7)
  assert.deepEqual(
    result.positions.map(position => position.id),
    ['p1', 'p2'],
  )

  const freshers = result.positions[0]
  assert.equal(freshers.ballots, 6)
  assert.equal(freshers.blankFirstPreferences, 1)
  assert.equal(rowByLabel(freshers.rows, 'Oscar - Oscar Sanderson')?.count, 2)
  assert.equal(rowByLabel(freshers.rows, 'Rasha - Rasha Baeigh')?.count, 1)
  assert.equal(rowByLabel(freshers.rows, 'Dropped - Dropped Person')?.count, 1)
  assert.equal(rowByLabel(freshers.rows, 'Dropped - Dropped Person')?.droppedOut, true)
  assert.equal(rowByLabel(freshers.rows, 'RON')?.count, 1)
  assert.equal(rowByLabel(freshers.rows, 'Oscar - Oscar Sanderson')?.percent, 33.3)
  // A candidate with no first preferences is still listed.
  assert.equal(rowByLabel(freshers.rows, 'Noah - Noah Major')?.count, 0)

  const pg = result.positions[1]
  assert.equal(pg.ballots, 2)
  assert.equal(rowByLabel(pg.rows, 'Casper - Casper Dancy')?.count, 2)
  assert.equal(rowByLabel(pg.rows, 'Marmik - Marmik Joshi')?.count, 0)
  assert.equal(rowByLabel(pg.rows, 'RON')?.count, 0)
})

test('keeps a vote that references a nomination removed since the ballot was cast', () => {
  const result = computeFirstPreferenceStandings({
    votes: [{ username: 'x', position: 'p1', RONPosition: null, preference: ['gone'] }],
    nominations: [{ id: 'n1', position: 'p1' }],
    positions: [{ id: 'p1', name: 'Freshers Rep', importance: 1 }],
  })

  const row = result.positions[0].rows.find(candidate => candidate.id === 'gone')
  assert.equal(row?.count, 1)
  assert.equal(row?.label, 'Unknown')
})

test('treats a numerical RON position with no preferences as a RON first preference', () => {
  const result = computeFirstPreferenceStandings({
    votes: [{ username: 'x', position: 'p1', RONPosition: 1, preference: [] }],
    nominations: [],
    positions: [{ id: 'p1', name: 'Freshers Rep', importance: 1 }],
  })

  assert.equal(result.positions[0].blankFirstPreferences, 0)
  assert.equal(result.positions[0].rows.find(row => row.id === RON_ID)?.count, 1)
})

test('loads election, positions, votes and nominations through the local API', async () => {
  const payload = {
    findByID: async () => ({
      id: 'e1',
      name: '2026 Autumn EGM',
      votingStart: '2026-10-20T09:00:00.000Z',
      votingEnd: '2026-10-27T09:00:00.000Z',
      positions: ['p1', 'p2'],
    }),
    find: async ({ collection }: { collection: string }) => {
      if (collection === 'positions') {
        return {
          docs: positions.map(position => ({
            ...position,
            description: '',
            updatedAt: '',
            createdAt: '',
          })),
        }
      }
      if (collection === 'votes') return { docs: votes }
      if (collection === 'nominations') return { docs: nominations }
      return { docs: [] }
    },
  } as unknown as Payload

  const result = await getElectionStandings(payload, 'e1')

  if (!result) {
    assert.fail('Expected standings for a known election')
  }

  assert.equal(result.election.name, '2026 Autumn EGM')
  assert.equal(result.ballots, 8)
  assert.equal(result.voters, 7)
  assert.equal(result.positions[0].id, 'p1')
  assert.equal(result.positions[0].rows.length > 0, true)
})

test('returns null for an unknown election', async () => {
  const payload = {
    findByID: async () => undefined,
    find: async () => ({ docs: [] }),
  } as unknown as Payload

  assert.equal(await getElectionStandings(payload, 'missing'), null)
})
