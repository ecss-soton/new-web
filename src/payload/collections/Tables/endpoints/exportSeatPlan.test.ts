import type { NextFunction, Response } from 'express'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload/types'

import { exportSeatPlan } from './exportSeatPlan'

/**
 * The seat-plan export's row mapping is the part worth pinning down (usernames for
 * members, blank names/usernames for plus-ones, unseated and no-table guests), so
 * it is exercised against an in-memory Payload stand-in.
 */

interface Doc {
  id?: string
  event?: string
  name?: string
  username?: string
  roles?: string[]
  sotonId?: string
  plusOneCount?: number
  dietaryRequirements?: string
  seatsPerTable?: number
  slug?: string
  createdAt?: string
  owner?: string
  members?: string[]
  seatPositions?: Array<Record<string, unknown>>
}

interface Store {
  events: Doc[]
  users: Doc[]
  holders: Doc[]
  tables: Doc[]
}

interface Where {
  and?: Where[]
  [field: string]: unknown
}

const matches = (doc: Doc, where?: Where): boolean => {
  if (!where) return true
  if (Array.isArray(where.and)) return where.and.every(clause => matches(doc, clause))

  return Object.entries(where).every(([field, condition]) => {
    if (field === 'and') return true
    const { equals, in: allowed } = condition as { equals?: unknown; in?: unknown[] }
    const value = (doc as Record<string, unknown>)[field]
    if (equals !== undefined) return value === equals
    if (allowed !== undefined) return allowed.includes(value)
    return true
  })
}

interface TestPayload {
  findByID: (args: { collection: string; id: string }) => Promise<Doc>
  find: (args: { collection: string; where?: Where }) => Promise<{ docs: Doc[]; totalDocs: number }>
}

const makePayload = (store: Store): TestPayload => ({
  findByID: async ({ collection, id }: { collection: string; id: string }): Promise<Doc> => {
    const list = collection === 'booking-events' ? store.events : store.tables
    const found = list.find(doc => doc.id === id)
    if (!found) throw new Error('not found')
    return found
  },
  find: async ({ collection, where }: { collection: string; where?: Where }) => {
    const list: Doc[] =
      collection === 'booking-events'
        ? store.events
        : collection === 'tables'
        ? store.tables
        : collection === 'users'
        ? store.users
        : store.holders
    const docs = list.filter(doc => matches(doc, where))
    return { docs, totalDocs: docs.length }
  },
})

interface MockResponse {
  statusCode: number
  headers: Record<string, string>
  body?: string
  status: (code: number) => MockResponse
  setHeader: (name: string, value: string) => MockResponse
  send: (body: string) => MockResponse
  json: (body: unknown) => MockResponse
}

const runExport = async (args: {
  store: Store
  user?: Doc
  eventId?: string | null
}): Promise<{ status: number; headers: Record<string, string>; body: unknown }> => {
  const payload = makePayload(args.store)
  let status = 200
  let body: unknown
  const headers: Record<string, string> = {}

  const res: MockResponse = {
    statusCode: 200,
    headers,
    status(code: number): MockResponse {
      status = code
      return this
    },
    setHeader(name: string, value: string): MockResponse {
      headers[name] = value
      return this
    },
    send(value: string): MockResponse {
      body = value
      return this
    },
    json(value: unknown): MockResponse {
      body = value
      return this
    },
  }

  const req = {
    user: args.user ?? { id: 'admin-1', roles: ['admin'], name: 'Ada Admin', username: 'adm1' },
    payload,
    query: args.eventId === null ? {} : { eventId: args.eventId ?? 'event-1' },
  }

  const next: NextFunction = () => {
    // Handlers in this repo never call next().
  }

  await exportSeatPlan(req as unknown as PayloadRequest, res as unknown as Response, next)

  return { status, headers, body }
}

const baseStore = (): Store => ({
  events: [{ id: 'event-1', name: 'Winter Ball', slug: 'winter-ball', seatsPerTable: 10 }],
  users: [
    { id: 'user-1', name: 'Sophia Advincula (sa9g24)', username: 'sa9g24' },
    { id: 'user-2', name: 'Dara Agunsoye', username: 'opa1g26' },
  ],
  holders: [
    {
      id: 'holder-1',
      event: 'event-1',
      sotonId: 'sa9g24',
      name: 'Sophia Advincula',
      plusOneCount: 1,
    },
    {
      id: 'holder-2',
      event: 'event-1',
      sotonId: 'opa1g26',
      name: 'Dara Agunsoye',
      plusOneCount: 0,
    },
    {
      id: 'holder-3',
      event: 'event-1',
      sotonId: 'xx1y23',
      name: 'No Table Guest',
      plusOneCount: 0,
    },
  ],
  tables: [
    {
      id: 'table-1',
      event: 'event-1',
      createdAt: '2025-11-01T10:00:00.000Z',
      owner: 'user-1',
      members: ['user-1', 'user-2'],
      seatPositions: [
        { seatIndex: 0, userId: 'user-1', name: 'Sophia Advincula' },
        { seatIndex: 1, plusOneOf: 'user-1', name: "Sophia's +1" },
      ],
    },
  ],
})

test('exports six columns with usernames and blank plus-one names', async () => {
  const result = await runExport({ store: baseStore() })

  assert.equal(result.status, 200)
  assert.equal(result.headers['Content-Type'], 'text/csv; charset=utf-8')
  assert.equal(
    result.headers['Content-Disposition'],
    'attachment; filename="winter-ball-seat-plan.csv"',
  )

  assert.equal(
    result.body,
    [
      'Table number,Seat number,Guest name,Guest type,Ticket holder,SotonID',
      '1,1,Sophia Advincula,normal,Sophia Advincula,sa9g24',
      '1,2,,plusone,Sophia Advincula,',
      '1,,Dara Agunsoye,normal,Dara Agunsoye,opa1g26',
      ',,No Table Guest,normal,No Table Guest,xx1y23',
      '',
    ].join('\r\n'),
  )
})

test('rejects non-admins', async () => {
  const result = await runExport({
    store: baseStore(),
    user: { id: 'user-1', roles: ['user'], name: 'Sophia Advincula', username: 'sa9g24' },
  })

  assert.equal(result.status, 401)
  assert.deepEqual(result.body, { error: 'Admin access required' })
})

test('rejects a missing event id', async () => {
  const result = await runExport({ store: baseStore(), eventId: null })

  assert.equal(result.status, 400)
  assert.deepEqual(result.body, { error: 'Missing "eventId" query parameter' })
})
