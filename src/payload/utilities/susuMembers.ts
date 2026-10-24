import type { SusuMember } from '../payload-types'
import {
  grantRolesForMembers,
  type MatchableMember,
  type MemberMatchStats,
  type PayloadLike,
  type UserDocLike,
} from './checkCsvAccounts'
import {
  displayNameWithoutUsername,
  fullNameEndpointKey,
  fullNameKey,
  type MemberCsvMember,
  normalizePersonName,
} from './memberCsv'
import { normalizeSotonId } from './sotonId'

export interface SusuMemberSyncStats {
  created: number
  updated: number
  unchanged: number
  total: number
}

export interface ApplyMembershipsResult extends MemberMatchStats {
  /** Number of website accounts checked. */
  users: number
  /** Number of active SUSU member records used. */
  members: number
}

interface SusuMemberFields {
  susuId: string
  displayName: string
  firstName: string
  lastName: string
  email: string
  normalizedName: string
  nameEndpoint: string
  active: boolean
  lastImport: string
}

const relationId = (value: SusuMember['lastImport'] | undefined | null): string => {
  if (!value) return ''
  return typeof value === 'string' ? value : value.id
}

/**
 * Stable key for a member across exports. `User ID` is the SUSU identifier and
 * persists between years; email and name are fallbacks for exports without it.
 */
export const susuMemberKey = (member: MemberCsvMember): string => {
  const userId = member.userId.trim()
  if (userId) return `id:${userId}`

  const email = member.email.trim().toLowerCase()
  if (email) return `email:${email}`

  return `name:${fullNameKey(member.firstName, member.lastName)}`
}

const fieldsFromCsvMember = (member: MemberCsvMember, importId: string): SusuMemberFields => {
  const normalizedName = fullNameKey(member.firstName, member.lastName)

  return {
    susuId: susuMemberKey(member),
    displayName: `${member.firstName} ${member.lastName}`.trim(),
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email.trim().toLowerCase(),
    normalizedName,
    nameEndpoint: fullNameEndpointKey(normalizedName),
    active: member.active,
    lastImport: importId,
  }
}

const changed = (current: SusuMember, desired: SusuMemberFields): boolean =>
  current.displayName !== desired.displayName ||
  current.firstName !== desired.firstName ||
  current.lastName !== desired.lastName ||
  (current.email ?? '') !== desired.email ||
  (current.normalizedName ?? '') !== desired.normalizedName ||
  (current.nameEndpoint ?? '') !== desired.nameEndpoint ||
  Boolean(current.active) !== desired.active ||
  relationId(current.lastImport) !== desired.lastImport

/**
 * Upserts the parsed CSV members into the durable collection.
 *
 * Members absent from a newer export keep their previous record: role grants are
 * add-only, so this collection is an index, not an eligibility reset.
 */
export const syncSusuMembers = async ({
  payload,
  members,
  importId,
}: {
  payload: PayloadLike
  members: MemberCsvMember[]
  importId: string
}): Promise<SusuMemberSyncStats> => {
  const existing = await payload.find({
    collection: 'susu-members',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  const byKey = new Map<string, SusuMember>()
  for (const doc of existing.docs) byKey.set(doc.susuId, doc)

  const stats: SusuMemberSyncStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    total: 0,
  }

  for (const member of members) {
    const desired = fieldsFromCsvMember(member, importId)
    stats.total++

    const current = byKey.get(desired.susuId)
    if (!current) {
      await payload.create({
        collection: 'susu-members',
        data: desired,
        overrideAccess: true,
      })
      stats.created++
      continue
    }

    if (!changed(current, desired)) {
      stats.unchanged++
      continue
    }

    await payload.update({
      collection: 'susu-members',
      id: current.id,
      data: desired,
      overrideAccess: true,
    })
    stats.updated++
  }

  return stats
}

const matchableFromSusuMember = (doc: SusuMember): MatchableMember => {
  const fullName = fullNameKey(doc.firstName, doc.lastName)

  return {
    key: doc.susuId,
    displayName:
      doc.displayName ??
      [doc.firstName, doc.lastName].filter((part): part is string => Boolean(part)).join(' '),
    email: (doc.email ?? '').trim().toLowerCase(),
    normalizedName: doc.normalizedName ?? fullName,
    nameEndpoint: doc.nameEndpoint ?? fullNameEndpointKey(fullName),
    active: Boolean(doc.active),
  }
}

/**
 * First Azure AD login: look the account up in the durable member collection
 * instead of re-reading the uploaded CSV. Safe across restarts/redeploys and
 * multiple app instances.
 */
export const grantRoleIfSusuMember = async ({
  payload,
  userDoc,
  role = 'susu',
}: {
  payload: PayloadLike
  userDoc: UserDocLike
  role?: 'admin' | 'user' | 'susu'
}): Promise<boolean> => {
  const currentRoles = userDoc.roles ?? []
  if (currentRoles.includes(role)) return false

  const email = userDoc.email?.trim().toLowerCase() ?? ''
  const name = displayNameWithoutUsername(userDoc.name, userDoc.username, userDoc.email)
  const normalizedName = normalizePersonName(name)
  const nameEndpoint = fullNameEndpointKey(name)

  const or: Array<Record<string, unknown>> = []
  if (email) or.push({ email: { equals: email } })
  if (nameEndpoint) {
    or.push({ normalizedName: { equals: normalizedName } })
    or.push({ nameEndpoint: { equals: nameEndpoint } })
  }

  if (or.length === 0) return false

  const matches = await payload.find({
    collection: 'susu-members',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [{ active: { equals: true } }, { or }],
    },
  })

  if (matches.totalDocs === 0) return false

  await payload.update({
    collection: 'users',
    id: userDoc.id,
    data: {
      roles: [...currentRoles, role],
    },
    overrideAccess: true,
  })

  payload.logger.info(
    `Assigned role '${role}' to user ${
      email || normalizeSotonId(userDoc.username) || String(userDoc.id)
    } (SUSU member match)`,
  )

  return true
}

/**
 * Admin recovery action: re-match every active stored member against every
 * account. Used after deploying a matching fix or after manually correcting a
 * member record, without needing to re-upload the CSV.
 */
export const applyStoredMemberships = async ({
  payload,
  role = 'susu',
}: {
  payload: PayloadLike
  role?: 'admin' | 'user' | 'susu'
}): Promise<ApplyMembershipsResult> => {
  const [membersResult, usersResult] = await Promise.all([
    payload.find({
      collection: 'susu-members',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      where: { active: { equals: true } },
    }),
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
    }),
  ])

  const members = membersResult.docs.map(matchableFromSusuMember)
  const match = await grantRolesForMembers({ payload, members, role })

  return {
    users: usersResult.totalDocs,
    members: members.length,
    ...match.stats,
  }
}
