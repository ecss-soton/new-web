import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  checkCsvAccountsFromContent,
  type PayloadLike,
  runCheckSingleUserFromCsvFile,
} from './checkCsvAccounts'

type FakeRole = 'admin' | 'user' | 'susu'

interface FakeUser {
  id: number
  name?: string
  email?: string
  username?: string
  roles?: FakeRole[]
}

const MEMBERSHIPS_HEADER =
  'User ID,First Name,Last Name,Email,Membership ID,Membership Type,Status,Start Date (d/m/Y),End Date (d/m/Y)'

const createFakePayload = (
  users: FakeUser[],
): {
  payload: PayloadLike
  users: FakeUser[]
  updates: Array<{ id: number; roles: FakeRole[] }>
} => {
  const updates: Array<{ id: number; roles: FakeRole[] }> = []

  const payload = {
    find: async () => ({
      docs: users.map(user => ({ ...user })),
      totalDocs: users.length,
    }),
    update: async ({ id, data }: { id: number; data: { roles: FakeRole[] } }) => {
      const user = users.find(candidate => candidate.id === id)
      if (user) user.roles = data.roles
      updates.push({ id, roles: data.roles })
      return user
    },
    logger: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    },
  }

  return { payload: payload as unknown as PayloadLike, users, updates }
}

const row = (id: string, first: string, last: string, email: string, status: string): string =>
  `${id},${first},${last},${email},1,ECS Membership,${status},01/09/2026,31/08/2027`

const membershipsCsv = (rows: string[]): string => [MEMBERSHIPS_HEADER, ...rows].join('\n')

test('grants susu on a unique name match and ignores inactive members', async () => {
  const { payload, updates } = createFakePayload([
    { id: 1, name: 'Ada Lovelace' },
    { id: 2, name: 'Alan Turing', roles: ['user'] },
  ])

  const result = await checkCsvAccountsFromContent({
    payload,
    csvContent: membershipsCsv([
      row('1', 'Ada', 'Lovelace', '', 'active'),
      row('2', 'Alan', 'Turing', '', 'expired'),
      row('3', 'Grace', 'Hopper', '', 'active'),
    ]),
  })

  assert.equal(result.stats.members, 3)
  assert.equal(result.stats.activeMembers, 2)
  assert.equal(result.stats.inactiveSkipped, 1)
  assert.equal(result.stats.matchedByName, 1)
  assert.equal(result.stats.matchedByEmail, 0)
  assert.equal(result.stats.rolesAdded, 1)
  assert.equal(result.stats.noMatch, 1)
  assert.deepEqual(updates, [{ id: 1, roles: ['susu'] }])
  assert.match(result.summary, /Matched by unique name: 1/)
  assert.match(result.summary, /present but empty/)
})

test('still matches by email and by the email local part', async () => {
  const { payload, updates } = createFakePayload([
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 2, name: 'Alan Turing', username: 'ab1c23' },
  ])

  const result = await checkCsvAccountsFromContent({
    payload,
    csvContent: membershipsCsv([
      row('1', 'Ada', 'Lovelace', 'ada@example.com', 'active'),
      row('2', 'Alan', 'Turing', 'ab1c23@soton.ac.uk', 'active'),
    ]),
  })

  assert.equal(result.stats.matchedByEmail, 2)
  assert.equal(result.stats.rolesAdded, 2)
  assert.equal(updates.length, 2)
})

test('matches a display name that has a middle name', async () => {
  const { payload, updates } = createFakePayload([{ id: 5, name: 'Dan James Abu-Reish' }])

  const result = await checkCsvAccountsFromContent({
    payload,
    csvContent: membershipsCsv([row('9', 'Dan', 'Abu Reish', '', 'active')]),
  })

  assert.equal(result.stats.matchedByName, 1)
  assert.deepEqual(updates, [{ id: 5, roles: ['susu'] }])
})

test('never grants when a name matches more than one account', async () => {
  const { payload, updates } = createFakePayload([
    { id: 1, name: 'Alex Smith' },
    { id: 2, name: 'Alex Smith' },
  ])

  const result = await checkCsvAccountsFromContent({
    payload,
    csvContent: membershipsCsv([row('7', 'Alex', 'Smith', '', 'active')]),
  })

  assert.equal(result.stats.ambiguousNames, 1)
  assert.equal(result.stats.rolesAdded, 0)
  assert.equal(updates.length, 0)
  assert.deepEqual(result.ambiguousNames, ['Alex Smith'])
})

test('does not grant a first-name-only match', async () => {
  const { payload, updates } = createFakePayload([{ id: 1, name: 'Tharun' }])

  const result = await checkCsvAccountsFromContent({
    payload,
    csvContent: membershipsCsv([row('3', 'Tharun', '.', '', 'active')]),
  })

  assert.equal(result.stats.incompleteNames, 1)
  assert.equal(result.stats.rolesAdded, 0)
  assert.equal(updates.length, 0)
})

test('is add-only and idempotent across repeated imports', async () => {
  const { payload, updates } = createFakePayload([{ id: 1, name: 'Ada Lovelace' }])
  const csvContent = membershipsCsv([row('1', 'Ada', 'Lovelace', '', 'active')])

  const first = await checkCsvAccountsFromContent({ payload, csvContent })
  const second = await checkCsvAccountsFromContent({ payload, csvContent })

  assert.equal(first.stats.rolesAdded, 1)
  assert.equal(second.stats.rolesAdded, 0)
  assert.equal(second.stats.alreadyHadRole, 1)
  assert.equal(updates.length, 1)
})

test('collapses duplicate membership rows for the same member', async () => {
  const { payload, updates } = createFakePayload([{ id: 1, name: 'Ada Lovelace' }])

  const result = await checkCsvAccountsFromContent({
    payload,
    csvContent: membershipsCsv([
      row('1', 'Ada', 'Lovelace', '', 'active'),
      row('1', 'Ada', 'Lovelace', '', 'expired'),
    ]),
  })

  assert.equal(result.stats.members, 1)
  assert.equal(result.stats.duplicateRows, 1)
  assert.equal(result.stats.rolesAdded, 1)
  assert.equal(updates.length, 1)
})

test('single-user check grants on an active name match only', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecss-member-csv-'))

  try {
    const activePath = path.join(dir, 'active.csv')
    fs.writeFileSync(
      activePath,
      membershipsCsv([row('1', 'Ada', 'Lovelace', '', 'active')]),
      'utf8',
    )
    const expiredPath = path.join(dir, 'expired.csv')
    fs.writeFileSync(
      expiredPath,
      membershipsCsv([row('1', 'Ada', 'Lovelace', '', 'expired')]),
      'utf8',
    )

    const { payload, updates } = createFakePayload([{ id: 1, name: 'Ada Lovelace' }])

    assert.equal(
      await runCheckSingleUserFromCsvFile({
        payload,
        csvFilePath: expiredPath,
        userDoc: { id: 1, name: 'Ada Lovelace', roles: ['user'] },
      }),
      false,
    )
    assert.equal(updates.length, 0)

    assert.equal(
      await runCheckSingleUserFromCsvFile({
        payload,
        csvFilePath: activePath,
        userDoc: { id: 1, name: 'Ada Lovelace', roles: ['user'] },
      }),
      true,
    )
    assert.deepEqual(updates, [{ id: 1, roles: ['user', 'susu'] }])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
