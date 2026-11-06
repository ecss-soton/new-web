import type { NextFunction, Response } from 'express'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload/types'

import { manageSeats } from './manageSeats'

/**
 * Seat-plan rules are integrity-sensitive, so they are exercised against a small
 * in-memory Payload stand-in. It covers exactly the queries `manageSeats` makes:
 * the table by join code, users by id, and the event's guest list.
 */

interface Doc {
  id?: string
  name?: string
  username?: string
  roles?: string[]
  event?: string
  sotonId?: string
  plusOneCount?: number
  joinCode?: string
  owner?: string
  members?: string[]
  locked?: boolean
  memberCount?: number
  seatsPerTable?: number
  isOpen?: boolean
  seatPositions?: Array<Record<string, unknown>>
}

interface Store {
  tables: Doc[]
  users: Doc[]
  holders: Doc[]
  events: Doc[]
}

interface WhereCondition {
  equals?: unknown
  in?: unknown[]
}

interface Where {
  and?: Where[]
  [field: string]: unknown
}

interface TestPayload {
  findByID: (args: { collection: string; id: string }) => Promise<Doc>
  find: (args: { collection: string; where?: Where }) => Promise<{ docs: Doc[]; totalDocs: number }>
  update: (args: { collection: string; id: string; data: Record<string, unknown> }) => Promise<Doc>
}

const matches = (doc: Doc, where?: Where): boolean => {
  if (!where) return true
  if (Array.isArray(where.and)) return where.and.every(clause => matches(doc, clause))

  return Object.entries(where).every(([field, condition]) => {
    if (field === 'and') return true
    const { equals, in: allowed } = condition as WhereCondition
    const value = (doc as Record<string, unknown>)[field]
    if (equals !== undefined) return value === equals
    if (allowed !== undefined) return allowed.includes(value)
    return true
  })
}

const makePayload = (store: Store): TestPayload => {
  const listFor = (collection: string): Doc[] => {
    if (collection === 'tables') return store.tables
    if (collection === 'booking-events') return store.events
    if (collection === 'users') return store.users
    return store.holders
  }

  return {
    findByID: async ({ collection, id }: { collection: string; id: string }): Promise<Doc> => {
      const found = listFor(collection).find(doc => doc.id === id)
      if (!found) throw new Error('not found')
      return found
    },
    find: async ({
      collection,
      where,
    }: {
      collection: string
      where?: Where
    }): Promise<{ docs: Doc[]; totalDocs: number }> => {
      const docs = listFor(collection).filter(doc => matches(doc, where))
      return { docs, totalDocs: docs.length }
    },
    update: async ({
      collection,
      id,
      data,
    }: {
      collection: string
      id: string
      data: Record<string, unknown>
    }): Promise<Doc> => {
      const doc = listFor(collection).find(entry => entry.id === id)
      if (!doc) throw new Error('not found')
      Object.assign(doc, data)
      return doc
    },
  }
}

interface MockResponse {
  statusCode: number
  body: Doc
  status: (code: number) => MockResponse
  json: (value: Doc) => MockResponse
}

const runManageSeats = async (args: {
  store: Store
  user: Doc
  body: Doc
}): Promise<{ status: number; json: Record<string, unknown> }> => {
  const payload = makePayload(args.store)
  let status = 200
  let body: Doc = {}

  const res: MockResponse = {
    statusCode: 200,
    body: {},
    status(code: number): MockResponse {
      status = code
      return this
    },
    json(value: Doc): MockResponse {
      body = value
      return this
    },
  }

  const next: NextFunction = () => {
    // Custom endpoints in this repo never call next(); the mock just satisfies
    // Payload's three-argument handler signature.
  }

  await manageSeats(
    {
      user: args.user,
      payload,
      params: { id: args.store.tables[0].joinCode },
      body: args.body,
    } as unknown as PayloadRequest,
    res as unknown as Response,
    next,
  )

  return { status, json: body as Record<string, unknown> }
}

const baseStore = (): Store => ({
  events: [{ id: 'event-1', seatsPerTable: 10, isOpen: true }],
  users: [
    { id: 'user-owner', name: 'Indigo Rivers', username: 'own1', roles: ['user'] },
    { id: 'user-member', name: 'Member Person', username: 'mem1', roles: ['user'] },
    { id: 'user-other', name: 'Other Person', username: 'oth1', roles: ['user'] },
    { id: 'user-admin', name: 'Ada Admin', username: 'adm1', roles: ['admin'] },
  ],
  holders: [
    { id: 'holder-owner', event: 'event-1', sotonId: 'own1', plusOneCount: 0 },
    { id: 'holder-member', event: 'event-1', sotonId: 'mem1', plusOneCount: 1 },
    { id: 'holder-other', event: 'event-1', sotonId: 'oth1', plusOneCount: 0 },
  ],
  tables: [
    {
      id: 'table-1',
      joinCode: 'ABCD2345',
      event: 'event-1',
      owner: 'user-owner',
      members: ['user-owner', 'user-member'],
      locked: false,
      memberCount: 3,
      seatPositions: [{ seatIndex: 0, userId: 'user-owner', name: 'Indigo Rivers' }],
    },
  ],
})

const owner = (store: Store): Doc => store.users.find(user => user.id === 'user-owner') as Doc
const member = (store: Store): Doc => store.users.find(user => user.id === 'user-member') as Doc

test('a member can place their guest-list plus-one in a free seat', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: member(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-owner' },
        { seatIndex: 1, userId: 'user-member' },
        { seatIndex: 2, plusOneOf: 'user-member' },
      ],
    },
  })

  assert.equal(result.status, 200)
  assert.deepEqual(store.tables[0].seatPositions?.[2], {
    seatIndex: 2,
    plusOneOf: 'user-member',
    name: "Member's +1",
  })
})

test('rejects a plus-one seat beyond the guest-list allowance', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: member(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-owner' },
        { seatIndex: 1, userId: 'user-member' },
        { seatIndex: 2, plusOneOf: 'user-member' },
        { seatIndex: 3, plusOneOf: 'user-member' },
      ],
    },
  })

  assert.equal(result.status, 400)
  assert.match(String(result.json.error), /plus-one/)
  assert.equal(store.tables[0].seatPositions?.length, 1)
})

test('rejects plus-one seats for someone who is not at the table', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: owner(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-owner' },
        { seatIndex: 1, plusOneOf: 'user-other' },
      ],
    },
  })

  assert.equal(result.status, 400)
  assert.match(String(result.json.error), /guest at this table/)
})

test('a member cannot move another member out of their seat', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: member(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-member' },
        { seatIndex: 1, userId: 'user-owner' },
      ],
    },
  })

  assert.equal(result.status, 403)
  assert.match(String(result.json.error), /your own seat/)
})

test('a member cannot invent a free-text seat', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: member(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-owner' },
        { seatIndex: 5, name: 'Mystery Guest' },
      ],
    },
  })

  assert.equal(result.status, 400)
  assert.match(String(result.json.error), /plus-one seat/)
})

test('the table owner can rearrange every seat, including plus-ones', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: owner(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-member' },
        { seatIndex: 1, userId: 'user-owner' },
        { seatIndex: 2, plusOneOf: 'user-member' },
      ],
    },
  })

  assert.equal(result.status, 200)
  assert.deepEqual(
    store.tables[0].seatPositions?.map(seat => seat.seatIndex),
    [0, 1, 2],
  )
})

test('rejects a seat that is both a guest and a plus-one', async () => {
  const store = baseStore()

  const result = await runManageSeats({
    store,
    user: owner(store),
    body: {
      seatPositions: [{ seatIndex: 0, userId: 'user-owner', plusOneOf: 'user-member' }],
    },
  })

  assert.equal(result.status, 400)
  assert.match(String(result.json.error), /both a guest and a plus-one/)
})

test('keeps existing plus-one seats when the allowance later shrinks', async () => {
  const store = baseStore()
  store.tables[0].seatPositions = [
    { seatIndex: 0, userId: 'user-owner', name: 'Indigo Rivers' },
    { seatIndex: 1, userId: 'user-member', name: 'Member Person' },
    { seatIndex: 2, plusOneOf: 'user-member', name: "Member's +1" },
    { seatIndex: 3, plusOneOf: 'user-member', name: "Member's +2" },
  ]

  const result = await runManageSeats({
    store,
    user: owner(store),
    body: {
      seatPositions: [
        { seatIndex: 0, userId: 'user-owner' },
        { seatIndex: 1, userId: 'user-member' },
        { seatIndex: 2, plusOneOf: 'user-member' },
        { seatIndex: 3, plusOneOf: 'user-member' },
      ],
    },
  })

  // Existing seats survive a reduced allowance; only *new* seats are refused.
  assert.equal(result.status, 200)
})
