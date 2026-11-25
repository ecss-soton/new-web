import type { NextFunction, Response } from 'express'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload/types'

import { adminDeleteTable } from './adminDeleteTable'
import { adminRemoveTableMember } from './adminRemoveTableMember'

/**
 * Admin table actions are integrity-sensitive (ownership transfer, seat cleanup,
 * deleting the last member's table), so they are exercised against an in-memory
 * Payload stand-in covering the local-API calls they make.
 */

interface Doc {
  id?: string
  name?: string
  username?: string
  roles?: string[]
  joinCode?: string
  event?: string
  owner?: string
  members?: string[]
  locked?: boolean
  seatPositions?: Array<Record<string, unknown>>
}

interface Store {
  tables: Doc[]
  users: Doc[]
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

interface UpdateCall {
  id: string
  data: Record<string, unknown>
}

interface TestPayload {
  findByID: (args: { collection: string; id: string }) => Promise<Doc>
  find: (args: { collection: string; where?: Where }) => Promise<{ docs: Doc[]; totalDocs: number }>
  update: (args: { collection: string; id: string; data: Record<string, unknown> }) => Promise<Doc>
  delete: (args: { collection: string; id: string }) => Promise<Doc>
}

const makePayload = (
  store: Store,
): { payload: TestPayload; updateCalls: UpdateCall[]; deletedIds: string[] } => {
  const updateCalls: UpdateCall[] = []
  const deletedIds: string[] = []
  const listFor = (collection: string): Doc[] =>
    collection === 'users' ? store.users : store.tables

  const payload: TestPayload = {
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
      id,
      data,
    }: {
      collection: string
      id: string
      data: Record<string, unknown>
    }): Promise<Doc> => {
      updateCalls.push({ id, data })
      const doc = store.tables.find(entry => entry.id === id)
      if (!doc) throw new Error('not found')
      Object.assign(doc, data)
      return doc
    },
    delete: async ({ id }: { collection: string; id: string }): Promise<Doc> => {
      deletedIds.push(id)
      const index = store.tables.findIndex(entry => entry.id === id)
      if (index < 0) throw new Error('not found')
      return store.tables.splice(index, 1)[0]
    },
  }

  return { payload, updateCalls, deletedIds }
}

interface MockResponse {
  statusCode: number
  body?: Record<string, unknown>
  status: (code: number) => MockResponse
  json: (value: Record<string, unknown>) => MockResponse
}

const run = async (args: {
  handler: typeof adminDeleteTable
  store: Store
  joinCode?: string
  body?: Record<string, unknown>
  user?: Doc
}): Promise<{
  status: number
  body: Record<string, unknown>
  updateCalls: UpdateCall[]
  deletedIds: string[]
}> => {
  const { payload, updateCalls, deletedIds } = makePayload(args.store)
  let status = 200
  let body: Record<string, unknown> = {}

  const res: MockResponse = {
    statusCode: 200,
    status(code: number): MockResponse {
      status = code
      return this
    },
    json(value: Record<string, unknown>): MockResponse {
      body = value
      return this
    },
  }

  const req = {
    user: args.user ?? { id: 'admin-1', roles: ['admin'], name: 'Ada Admin', username: 'adm1' },
    payload,
    params: { id: args.joinCode ?? 'ABCD2345' },
    body: args.body ?? {},
  }

  const next: NextFunction = () => {
    // Handlers in this repo never call next().
  }

  await args.handler(req as unknown as PayloadRequest, res as unknown as Response, next)

  return { status, body, updateCalls, deletedIds }
}

const baseStore = (): Store => ({
  users: [
    { id: 'user-1', name: 'Sophia Advincula', username: 'sa9g24' },
    { id: 'user-2', name: 'Dara Agunsoye', username: 'opa1g26' },
  ],
  tables: [
    {
      id: 'table-1',
      joinCode: 'ABCD2345',
      event: 'event-1',
      owner: 'user-1',
      members: ['user-1', 'user-2'],
      locked: false,
      seatPositions: [
        { seatIndex: 0, userId: 'user-1', name: 'Sophia Advincula' },
        { seatIndex: 1, userId: 'user-2', name: 'Dara Agunsoye' },
        { seatIndex: 2, plusOneOf: 'user-2', name: "Dara's +1" },
      ],
    },
  ],
})

const soleMemberStore = (): Store => ({
  users: [{ id: 'user-1', name: 'Sophia Advincula', username: 'sa9g24' }],
  tables: [
    {
      id: 'table-1',
      joinCode: 'ABCD2345',
      event: 'event-1',
      owner: 'user-1',
      members: ['user-1'],
      locked: false,
      seatPositions: [{ seatIndex: 0, userId: 'user-1', name: 'Sophia Advincula' }],
    },
  ],
})

test('an admin can delete a table and its seating', async () => {
  const store = baseStore()

  const result = await run({ handler: adminDeleteTable, store })

  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { success: true })
  assert.deepEqual(result.deletedIds, ['table-1'])
  assert.equal(store.tables.length, 0)
})

test('non-admins cannot delete a table', async () => {
  const store = baseStore()

  const result = await run({
    handler: adminDeleteTable,
    store,
    user: { id: 'user-2', roles: ['user'], name: 'Dara Agunsoye', username: 'opa1g26' },
  })

  assert.equal(result.status, 401)
  assert.equal(store.tables.length, 1)
})

test('deleting an unknown table returns 404', async () => {
  const result = await run({ handler: adminDeleteTable, store: baseStore(), joinCode: 'NOPE1234' })

  assert.equal(result.status, 404)
})

test('removing a member clears their seat and plus-one seats', async () => {
  const store = baseStore()

  const result = await run({
    handler: adminRemoveTableMember,
    store,
    body: { userId: 'user-2' },
  })

  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { success: true, tableDeleted: false })
  assert.equal(result.updateCalls.length, 1)

  const data = result.updateCalls[0].data
  assert.deepEqual(data.members, ['user-1'])
  assert.deepEqual(data.seatPositions, [
    { seatIndex: 0, userId: 'user-1', name: 'Sophia Advincula' },
  ])
  assert.equal(data.owner, undefined)
})

test('removing the owner hands ownership to the next member', async () => {
  const store = baseStore()

  const result = await run({
    handler: adminRemoveTableMember,
    store,
    body: { userId: 'user-1' },
  })

  assert.equal(result.status, 200)
  assert.deepEqual(result.updateCalls[0].data.members, ['user-2'])
  assert.equal(result.updateCalls[0].data.owner, 'user-2')
})

test('removing the last member deletes the table', async () => {
  const store = soleMemberStore()

  const result = await run({
    handler: adminRemoveTableMember,
    store,
    body: { userId: 'user-1' },
  })

  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { success: true, tableDeleted: true })
  assert.deepEqual(result.deletedIds, ['table-1'])
  assert.equal(result.updateCalls.length, 0)
})

test('cannot remove someone who is not at the table', async () => {
  const store = baseStore()
  store.users.push({ id: 'user-3', name: 'Unrelated Person', username: 'un1x23' })

  const result = await run({
    handler: adminRemoveTableMember,
    store,
    body: { userId: 'user-3' },
  })

  assert.equal(result.status, 400)
  assert.match(String(result.body.error), /not at this table/)
  assert.equal(result.updateCalls.length, 0)
})

test('non-admins cannot remove members', async () => {
  const result = await run({
    handler: adminRemoveTableMember,
    store: baseStore(),
    body: { userId: 'user-2' },
    user: { id: 'user-1', roles: ['user'], name: 'Sophia Advincula', username: 'sa9g24' },
  })

  assert.equal(result.status, 401)
  assert.equal(result.updateCalls.length, 0)
})

test('remove-member requires a user id', async () => {
  const result = await run({ handler: adminRemoveTableMember, store: baseStore(), body: {} })

  assert.equal(result.status, 400)
  assert.match(String(result.body.error), /userId/)
})
