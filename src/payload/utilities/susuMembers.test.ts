import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { PayloadLike } from './checkCsvAccounts'
import type { MemberCsvMember } from './memberCsv'
import {
  applyStoredMemberships,
  grantRoleIfSusuMember,
  susuMemberKey,
  syncSusuMembers,
} from './susuMembers'

type FakeRole = 'admin' | 'user' | 'susu'

interface FakeUser {
  id: number
  name?: string
  email?: string
  username?: string
  roles?: FakeRole[]
}

interface FakeMember {
  id: number
  susuId: string
  displayName?: string
  firstName?: string
  lastName?: string
  email?: string
  normalizedName?: string
  nameEndpoint?: string
  active?: boolean
  lastImport?: string
  updatedAt: string
  createdAt: string
}

type FakeWhere = Record<string, unknown>

const matchesWhere = (doc: Record<string, unknown>, where?: FakeWhere): boolean => {
  if (!where) return true

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and') {
      if (!Array.isArray(value) || !value.every(clause => matchesWhere(doc, clause as FakeWhere))) {
        return false
      }
      continue
    }

    if (key === 'or') {
      if (!Array.isArray(value) || !value.some(clause => matchesWhere(doc, clause as FakeWhere))) {
        return false
      }
      continue
    }

    const clause = value as Record<string, unknown>
    if (clause && Object.prototype.hasOwnProperty.call(clause, 'equals')) {
      if (doc[key] !== clause.equals) return false
      continue
    }

    return false
  }

  return true
}

const createFakePayload = ({
  users,
  members = [],
}: {
  users: FakeUser[]
  members?: FakeMember[]
}): {
  payload: PayloadLike
  users: FakeUser[]
  members: FakeMember[]
  updates: Array<{ collection: string; id: number; data: Record<string, unknown> }>
  creates: Array<{ collection: string; data: Record<string, unknown> }>
} => {
  let nextMemberId = members.length + 1
  const updates: Array<{ collection: string; id: number; data: Record<string, unknown> }> = []
  const creates: Array<{ collection: string; data: Record<string, unknown> }> = []

  const payload = {
    find: async ({
      collection,
      where,
    }: {
      collection: string
      where?: FakeWhere
    }): Promise<{ docs: Array<Record<string, unknown>>; totalDocs: number }> => {
      const source: Array<Record<string, unknown>> =
        collection === 'users'
          ? (users as unknown as Array<Record<string, unknown>>)
          : collection === 'susu-members'
          ? (members as unknown as Array<Record<string, unknown>>)
          : []

      const docs = source.filter(doc => matchesWhere(doc, where)).map(doc => ({ ...doc }))

      return { docs, totalDocs: docs.length }
    },
    create: async ({
      collection,
      data,
    }: {
      collection: string
      data: Record<string, unknown>
    }): Promise<unknown> => {
      creates.push({ collection, data })

      if (collection === 'susu-members') {
        const member: FakeMember = {
          ...(data as unknown as Omit<FakeMember, 'id' | 'createdAt' | 'updatedAt'>),
          id: nextMemberId++,
          createdAt: '',
          updatedAt: '',
        }
        members.push(member)
        return member
      }

      return data
    },
    update: async ({
      collection,
      id,
      data,
    }: {
      collection: string
      id: number
      data: Record<string, unknown>
    }): Promise<unknown> => {
      updates.push({ collection, id, data })

      if (collection === 'users') {
        const user = users.find(candidate => candidate.id === id)
        if (user) Object.assign(user, data)
        return user
      }

      if (collection === 'susu-members') {
        const member = members.find(candidate => candidate.id === id)
        if (member) Object.assign(member, data)
        return member
      }

      return undefined
    },
    logger: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    },
  }

  return {
    payload: payload as unknown as PayloadLike,
    users,
    members,
    updates,
    creates,
  }
}

const csvMember = (overrides: Partial<MemberCsvMember> = {}): MemberCsvMember => ({
  userId: '173525',
  firstName: 'Henry',
  lastName: 'Foster',
  email: '',
  membershipTypes: ['Year Membership 26/27'],
  statuses: ['active'],
  active: true,
  ...overrides,
})

const susuMember = (overrides: Partial<FakeMember> = {}): FakeMember => ({
  id: 1,
  susuId: 'id:173525',
  displayName: 'Henry Foster',
  firstName: 'Henry',
  lastName: 'Foster',
  email: '',
  normalizedName: 'henry foster',
  nameEndpoint: 'henry foster',
  active: true,
  lastImport: 'import-1',
  updatedAt: '',
  createdAt: '',
  ...overrides,
})

test('builds a stable member key from the SUSU identifiers', () => {
  assert.equal(susuMemberKey(csvMember()), 'id:173525')
  assert.equal(
    susuMemberKey(csvMember({ userId: '', email: 'Henry@Example.com' })),
    'email:henry@example.com',
  )
  assert.equal(
    susuMemberKey(csvMember({ userId: '', email: '', lastName: 'Foster' })),
    'name:henry foster',
  )
})

test('syncs parsed members into the durable collection, idempotently', async () => {
  const { payload, members, creates } = createFakePayload({ users: [] })

  const first = await syncSusuMembers({
    payload,
    members: [csvMember()],
    importId: 'import-1',
  })

  assert.deepEqual(first, { created: 1, updated: 0, unchanged: 0, total: 1 })
  assert.equal(members.length, 1)
  assert.equal(members[0].normalizedName, 'henry foster')
  assert.equal(members[0].nameEndpoint, 'henry foster')
  assert.equal(members[0].active, true)
  assert.equal(creates[0].collection, 'susu-members')

  const second = await syncSusuMembers({
    payload,
    members: [csvMember()],
    importId: 'import-1',
  })
  assert.deepEqual(second, { created: 0, updated: 0, unchanged: 1, total: 1 })

  const third = await syncSusuMembers({
    payload,
    members: [csvMember({ active: false, firstName: 'Henry', lastName: 'Foster-Smith' })],
    importId: 'import-2',
  })
  assert.deepEqual(third, { created: 0, updated: 1, unchanged: 0, total: 1 })
  assert.equal(members[0].active, false)
  assert.equal(members[0].lastName, 'Foster-Smith')
  assert.equal(members[0].normalizedName, 'henry foster smith')
})

test('grants susu to a new Azure AD account from the stored members', async () => {
  const { payload, users, updates } = createFakePayload({
    users: [{ id: 1, name: 'Henry Foster (hwjf1g26)', username: 'hwjf1g26', roles: ['user'] }],
    members: [susuMember()],
  })

  const granted = await grantRoleIfSusuMember({
    payload,
    userDoc: { id: 1, name: 'Henry Foster (hwjf1g26)', username: 'hwjf1g26', roles: ['user'] },
  })

  assert.equal(granted, true)
  assert.deepEqual(users[0].roles, ['user', 'susu'])
  assert.deepEqual(updates, [{ collection: 'users', id: 1, data: { roles: ['user', 'susu'] } }])
})

test('does not grant from inactive members or when the role already exists', async () => {
  const inactive = createFakePayload({
    users: [{ id: 1, name: 'Henry Foster (hwjf1g26)', username: 'hwjf1g26', roles: ['user'] }],
    members: [susuMember({ active: false })],
  })

  assert.equal(
    await grantRoleIfSusuMember({
      payload: inactive.payload,
      userDoc: { id: 1, name: 'Henry Foster (hwjf1g26)', username: 'hwjf1g26', roles: ['user'] },
    }),
    false,
  )
  assert.equal(inactive.updates.length, 0)

  const already = createFakePayload({
    users: [
      { id: 1, name: 'Henry Foster (hwjf1g26)', username: 'hwjf1g26', roles: ['user', 'susu'] },
    ],
    members: [susuMember()],
  })

  assert.equal(
    await grantRoleIfSusuMember({
      payload: already.payload,
      userDoc: {
        id: 1,
        name: 'Henry Foster (hwjf1g26)',
        username: 'hwjf1g26',
        roles: ['user', 'susu'],
      },
    }),
    false,
  )
  assert.equal(already.updates.length, 0)
})

test('can match a stored member by email', async () => {
  const { payload, updates } = createFakePayload({
    users: [{ id: 1, name: 'H. Foster', email: 'hwjf1g26@soton.ac.uk', roles: ['user'] }],
    members: [susuMember({ email: 'hwjf1g26@soton.ac.uk' })],
  })

  assert.equal(
    await grantRoleIfSusuMember({
      payload,
      userDoc: { id: 1, name: 'H. Foster', email: 'hwjf1g26@soton.ac.uk', roles: ['user'] },
    }),
    true,
  )
  assert.equal(updates.length, 1)
})

test('re-applies stored memberships to existing accounts', async () => {
  const { payload, users } = createFakePayload({
    users: [
      { id: 1, name: 'Henry Foster (hwjf1g26)', username: 'hwjf1g26', roles: ['user'] },
      { id: 2, name: 'Alan Turing', roles: ['user'] },
      { id: 3, name: 'Grace Hopper', roles: ['susu'] },
    ],
    members: [
      susuMember(),
      susuMember({
        id: 2,
        susuId: 'id:2',
        displayName: 'Alan Turing',
        firstName: 'Alan',
        lastName: 'Turing',
        normalizedName: 'alan turing',
        nameEndpoint: 'alan turing',
      }),
      susuMember({
        id: 3,
        susuId: 'id:3',
        displayName: 'Grace Hopper',
        firstName: 'Grace',
        lastName: 'Hopper',
        normalizedName: 'grace hopper',
        nameEndpoint: 'grace hopper',
        active: false,
      }),
    ],
  })

  const result = await applyStoredMemberships({ payload })

  assert.equal(result.users, 3)
  assert.equal(result.members, 2)
  assert.equal(result.rolesAdded, 2)
  assert.deepEqual(users[0].roles, ['user', 'susu'])
  assert.deepEqual(users[1].roles, ['user', 'susu'])
})
