import type { NextFunction, Response } from 'express'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload/types'

import { importTicketHolderCsv } from './importCsv'

/**
 * The import endpoint's rules that are not part of the pure CSV parser are
 * checked against an in-memory Payload stand-in: create/update payloads and the
 * add/overwrite behaviour. In particular, a SUSU sales overwrite must never send
 * `dietaryRequirements`.
 */

interface Doc {
  id?: string
  event?: string
  sotonId?: string
  name?: string
  username?: string
  roles?: string[]
  plusOneCount?: number
  dietaryRequirements?: string
  seatsPerTable?: number
}

interface Store {
  events: Doc[]
  users: Doc[]
  holders: Doc[]
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

interface CreateCall {
  data: Record<string, unknown>
}

const makePayload = (
  store: Store,
): {
  payload: {
    findByID: (args: { collection: string; id: string }) => Promise<Doc>
    find: (args: {
      collection: string
      where?: Where
    }) => Promise<{ docs: Doc[]; totalDocs: number }>
    update: (args: {
      collection: string
      id: string
      data: Record<string, unknown>
    }) => Promise<Doc>
    create: (args: { collection: string; data: Record<string, unknown> }) => Promise<Doc>
  }
  updateCalls: UpdateCall[]
  createCalls: CreateCall[]
} => {
  const updateCalls: UpdateCall[] = []
  const createCalls: CreateCall[] = []

  const payload = {
    findByID: async ({ collection, id }: { collection: string; id: string }): Promise<Doc> => {
      const list = collection === 'booking-events' ? store.events : store.holders
      const found = list.find(doc => doc.id === id)
      if (!found) throw new Error('not found')
      return found
    },
    find: async ({ collection, where }: { collection: string; where?: Where }) => {
      const list = collection === 'users' ? store.users : store.holders
      const docs = list.filter(doc => matches(doc, where))
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
      const doc = store.holders.find(entry => entry.id === id)
      if (!doc) throw new Error('not found')
      Object.assign(doc, data as Doc)
      return doc
    },
    create: async ({
      data,
    }: {
      collection: string
      data: Record<string, unknown>
    }): Promise<Doc> => {
      createCalls.push({ data })
      const doc = { id: `holder-${store.holders.length + 1}`, ...(data as Doc) }
      store.holders.push(doc)
      return doc
    },
  }

  return { payload, updateCalls, createCalls }
}

const SALES_HEADER =
  '" ","Customer","Email","Qty","Order Reference","Date","Member Type","Ticket Type","Price","Total","Status"'

const salesCsv = (...rows: string[]): string => [SALES_HEADER, ...rows].join('\n')

const salesRow = (customer: string, email: string, qty: string, status = 'Paid'): string =>
  `" ","${customer}","${email}","${qty}","O/1/1","09/11/2026 16:40","Member","Ticket","£29.95","£29.95","${status}"`

const admin = { id: 'admin-1', roles: ['admin'], name: 'Ada Admin', username: 'adm1' }

const runImport = async (args: {
  store: Store
  csv: string
  mode?: 'add' | 'overwrite'
}): Promise<{
  status: number
  json: Record<string, unknown>
  updateCalls: UpdateCall[]
  createCalls: CreateCall[]
}> => {
  const { payload, updateCalls, createCalls } = makePayload(args.store)
  let status = 200
  let body: Record<string, unknown> = {}

  const res = {
    status(code: number) {
      status = code
      return this
    },
    json(value: Record<string, unknown>) {
      body = value
      return this
    },
  }

  const req = {
    user: admin,
    payload,
    body: { csv: args.csv, eventId: 'event-1', mode: args.mode ?? 'add' },
  }

  const next: NextFunction = () => {
    // Handlers in this repo never call next().
  }

  await importTicketHolderCsv(req as unknown as PayloadRequest, res as unknown as Response, next)

  return { status, json: body, updateCalls, createCalls }
}

const baseStore = (): Store => ({
  events: [{ id: 'event-1', name: 'Winter Ball', seatsPerTable: 10 }],
  users: [],
  holders: [
    {
      id: 'holder-1',
      event: 'event-1',
      sotonId: 'sa9g24',
      name: 'Sophia A',
      plusOneCount: 0,
      dietaryRequirements: 'Vegan',
    },
  ],
})

test('a sales overwrite updates plus-ones but keeps dietary requirements', async () => {
  const store = baseStore()

  const result = await runImport({
    store,
    mode: 'overwrite',
    csv: salesCsv(salesRow('Advincula, Sophia', 'sa9g24@soton.ac.uk', '2')),
  })

  assert.equal(result.status, 200)
  assert.equal(result.json.format, 'sales')
  assert.equal(result.json.updated, 1)
  assert.equal(result.updateCalls.length, 1)
  assert.deepEqual(result.updateCalls[0].data, {
    name: 'Sophia Advincula',
    plusOneCount: 1,
  })
  assert.equal(store.holders[0].dietaryRequirements, 'Vegan')
  assert.equal(store.holders[0].plusOneCount, 1)
})

test('a guest-list overwrite still resets dietary requirements', async () => {
  const store = baseStore()

  const result = await runImport({
    store,
    mode: 'overwrite',
    csv: ['sotonId,name,plusOneCount,dietaryRequirements', 'sa9g24,Sophia Advincula,1,'].join('\n'),
  })

  assert.equal(result.status, 200)
  assert.equal(result.json.format, 'guest-list')
  assert.deepEqual(result.updateCalls[0].data, {
    name: 'Sophia Advincula',
    plusOneCount: 1,
    dietaryRequirements: '',
  })
})

test('adds sales buyers with no dietary and the flipped name', async () => {
  const store: Store = { events: [{ id: 'event-1', seatsPerTable: 10 }], users: [], holders: [] }

  const result = await runImport({
    store,
    mode: 'add',
    csv: salesCsv(
      salesRow('Advincula, Sophia', 'sa9g24@soton.ac.uk', '2'),
      salesRow('Agunsoye, Dara', 'opa1g26@soton.ac.uk', '1'),
    ),
  })

  assert.equal(result.status, 200)
  assert.equal(result.json.created, 2)
  assert.deepEqual(result.createCalls[0].data, {
    event: 'event-1',
    sotonId: 'sa9g24',
    name: 'Sophia Advincula',
    plusOneCount: 1,
    dietaryRequirements: '',
  })
})

test('add mode skips buyers already on the list', async () => {
  const store = baseStore()

  const result = await runImport({
    store,
    mode: 'add',
    csv: salesCsv(salesRow('Advincula, Sophia', 'sa9g24@soton.ac.uk', '2')),
  })

  assert.equal(result.status, 200)
  assert.equal(result.json.skipped, 1)
  assert.equal(result.createCalls.length, 0)
  assert.equal(result.updateCalls.length, 0)
})

test('rejects a sales file with no paid rows', async () => {
  const store = baseStore()

  const result = await runImport({
    store,
    mode: 'add',
    csv: salesCsv(salesRow('Advincula, Sophia', 'sa9g24@soton.ac.uk', '2', 'Refunded')),
  })

  assert.equal(result.status, 400)
  assert.match(String(result.json.error), /No rows/i)
})
