import fs from 'fs'
import type { Payload } from 'payload'

import {
  displayNameWithoutUsername,
  fullNameEndpointKey,
  fullNameKey,
  type MemberCsvFormat,
  type MemberCsvMember,
  type MemberCsvParseResult,
  normalizePersonName,
  parseMemberCsv,
} from './memberCsv'
import { normalizeSotonId } from './sotonId'

type MemberRole = 'admin' | 'user' | 'susu'

export interface PayloadLike {
  find: Payload['find']
  create: Payload['create']
  update: Payload['update']
  logger: Payload['logger']
}

interface UserRecord {
  id: string | number
  name?: string | null
  email?: string | null
  username?: string | null
  roles?: MemberRole[] | null
}

export interface UserDocLike {
  id: string | number
  name?: string | null
  email?: string | null
  username?: string | null
  roles?: MemberRole[] | null
}

/**
 * A member from either the freshly parsed CSV or the durable `susu-members`
 * collection, reduced to the keys the matcher needs.
 */
export interface MatchableMember {
  /** Used for logging/deduplication only. */
  key: string
  displayName: string
  email: string
  normalizedName: string
  nameEndpoint: string
  active: boolean
}

export interface MemberMatchStats {
  activeMembers: number
  inactiveSkipped: number
  matchedByEmail: number
  matchedByName: number
  rolesAdded: number
  alreadyHadRole: number
  ambiguousNames: number
  incompleteNames: number
  noMatch: number
}

export interface MemberMatchResult {
  stats: MemberMatchStats
  ambiguousNames: string[]
  incompleteNames: string[]
}

export interface CsvAccountCheckStats extends MemberMatchStats {
  dataRows: number
  invalidRows: number
  duplicateRows: number
  members: number
  emailColumnPresent: boolean
  emailColumnEmpty: boolean
}

export interface CsvAccountCheckResult {
  stats: CsvAccountCheckStats
  summary: string
  format: MemberCsvFormat
  headers: string[]
  ambiguousNames: string[]
  incompleteNames: string[]
}

const MAX_LISTED_NAMES = 25

/** Decodes UTF-8 exports, falling back to latin1 for Excel's "CSV (Windows)". */
export const decodeCsvBuffer = (buffer: Buffer): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return buffer.toString('latin1')
  }
}

export const parseCsvFile = (csvFilePath: string): MemberCsvParseResult => {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`Could not find CSV file at ${csvFilePath}`)
  }

  return parseMemberCsv(decodeCsvBuffer(fs.readFileSync(csvFilePath)))
}

const displayNameOf = (member: MatchableMember): string =>
  member.displayName || member.key || '(unnamed row)'

export const matchableMemberFromCsv = (member: MemberCsvMember): MatchableMember => {
  const normalizedName = fullNameKey(member.firstName, member.lastName)

  return {
    key: member.userId || member.email || normalizedName,
    displayName: `${member.firstName} ${member.lastName}`.trim(),
    email: member.email.trim().toLowerCase(),
    normalizedName,
    // Requires at least two name tokens; rows such as `Tharun .` are incomplete
    // and must not fall back to a first-name-only match.
    nameEndpoint: fullNameEndpointKey(normalizedName),
    active: member.active,
  }
}

export const matchableMembersFromCsv = (members: MemberCsvMember[]): MatchableMember[] =>
  members.map(matchableMemberFromCsv)

const addToIndex = (index: Map<string, UserRecord[]>, key: string, user: UserRecord): void => {
  if (!key) return

  const existing = index.get(key)
  if (!existing) {
    index.set(key, [user])
    return
  }

  const alreadyListed = existing.some(candidate => String(candidate.id) === String(user.id))
  if (!alreadyListed) existing.push(user)
}

interface UserIndex {
  byEmail: Map<string, UserRecord[]>
  byUsername: Map<string, UserRecord[]>
  byExactName: Map<string, UserRecord[]>
  byNameEndpoints: Map<string, UserRecord[]>
}

/**
 * Reads every user once and indexes them by the identifiers a SUSU export can
 * offer. The exports we receive have no email column values and no website
 * username, so the name indexes are what make matching possible at all.
 *
 * Azure AD display names look like `Henry Foster (hwjf1g26)`; the username
 * suffix is removed before building the name index.
 */
const loadUserIndex = async (payload: PayloadLike): Promise<UserIndex> => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  const docs = (result as unknown as { docs?: UserRecord[] }).docs ?? []
  const index: UserIndex = {
    byEmail: new Map(),
    byUsername: new Map(),
    byExactName: new Map(),
    byNameEndpoints: new Map(),
  }

  for (const user of docs) {
    const name = displayNameWithoutUsername(user.name, user.username, user.email)

    addToIndex(index.byEmail, user.email?.trim().toLowerCase() ?? '', user)
    addToIndex(index.byUsername, normalizeSotonId(user.username), user)
    addToIndex(index.byExactName, normalizePersonName(name), user)
    addToIndex(index.byNameEndpoints, fullNameEndpointKey(name), user)
  }

  return index
}

const uniqueUser = (users?: UserRecord[]): { user?: UserRecord; ambiguous?: boolean } => {
  if (!users || users.length === 0) return {}
  if (users.length === 1) return { user: users[0] }

  return { ambiguous: true }
}

interface Resolution {
  user?: UserRecord
  via?: 'email' | 'name'
  ambiguous?: boolean
  incomplete?: boolean
}

const resolveMember = (index: UserIndex, member: MatchableMember): Resolution => {
  if (member.email) {
    const byEmail = uniqueUser(index.byEmail.get(member.email))
    if (byEmail.user) return { user: byEmail.user, via: 'email' }
    if (byEmail.ambiguous) return { ambiguous: true }

    const byUsername = uniqueUser(index.byUsername.get(normalizeSotonId(member.email)))
    if (byUsername.user) return { user: byUsername.user, via: 'email' }
    if (byUsername.ambiguous) return { ambiguous: true }
  }

  if (!member.nameEndpoint) return { incomplete: true }

  const exact = uniqueUser(index.byExactName.get(member.normalizedName))
  if (exact.user) return { user: exact.user, via: 'name' }
  if (exact.ambiguous) return { ambiguous: true }

  const endpoints = uniqueUser(index.byNameEndpoints.get(member.nameEndpoint))
  if (endpoints.user) return { user: endpoints.user, via: 'name' }
  if (endpoints.ambiguous) return { ambiguous: true }

  return {}
}

/**
 * Matches members to website accounts and grants the role. Matching is
 * deliberately limited to a unique account per member; ambiguous names are
 * reported instead of guessed.
 *
 * Used both by the CSV import (members from the file) and by the "re-apply"
 * admin action (members from the `susu-members` collection).
 */
export const grantRolesForMembers = async ({
  payload,
  members,
  role = 'susu',
}: {
  payload: PayloadLike
  members: MatchableMember[]
  role?: MemberRole
}): Promise<MemberMatchResult> => {
  const index = await loadUserIndex(payload)
  const grantedUsers = new Set<string>()
  const ambiguousNames: string[] = []
  const incompleteNames: string[] = []

  const stats: MemberMatchStats = {
    activeMembers: 0,
    inactiveSkipped: 0,
    matchedByEmail: 0,
    matchedByName: 0,
    rolesAdded: 0,
    alreadyHadRole: 0,
    ambiguousNames: 0,
    incompleteNames: 0,
    noMatch: 0,
  }

  for (const member of members) {
    if (!member.active) {
      stats.inactiveSkipped++
      continue
    }

    stats.activeMembers++

    const resolution = resolveMember(index, member)

    if (!resolution.user) {
      if (resolution.ambiguous) {
        ambiguousNames.push(displayNameOf(member))
      } else if (resolution.incomplete) {
        incompleteNames.push(displayNameOf(member))
      } else {
        stats.noMatch++
      }
      continue
    }

    if (resolution.via === 'email') stats.matchedByEmail++
    else stats.matchedByName++

    const userId = String(resolution.user.id)
    if (grantedUsers.has(userId)) continue
    grantedUsers.add(userId)

    const currentRoles = resolution.user.roles ?? []
    if (currentRoles.includes(role)) {
      stats.alreadyHadRole++
      continue
    }

    await payload.update({
      collection: 'users',
      id: resolution.user.id,
      data: {
        roles: [...currentRoles, role],
      },
      overrideAccess: true,
    })

    resolution.user.roles = [...currentRoles, role]
    stats.rolesAdded++
  }

  stats.ambiguousNames = ambiguousNames.length
  stats.incompleteNames = incompleteNames.length

  return { stats, ambiguousNames, incompleteNames }
}

export const formatCsvAccountCheckSummary = (result: CsvAccountCheckResult): string => {
  const { stats } = result
  const lines: string[] = [
    `CSV format: ${
      result.format === 'members' ? 'one row per member (roll-up)' : 'one row per membership'
    }`,
    `Columns: ${result.headers.join(', ')}`,
    `Rows read: ${stats.dataRows} (${stats.invalidRows} unusable, ${stats.duplicateRows} duplicate membership rows merged)`,
    `Unique members: ${stats.members}`,
    `Active members: ${stats.activeMembers}`,
    `Inactive members skipped: ${stats.inactiveSkipped}`,
  ]

  if (!stats.emailColumnPresent) {
    lines.push('Email column: not present - accounts matched by name')
  } else if (stats.emailColumnEmpty) {
    lines.push('Email column: present but empty in every row - accounts matched by name')
  } else {
    lines.push('Email column: present')
  }

  lines.push(
    `Matched by email/username: ${stats.matchedByEmail}`,
    `Matched by unique name: ${stats.matchedByName}`,
    `New 'susu' roles added: ${stats.rolesAdded}`,
    `Accounts that already had 'susu': ${stats.alreadyHadRole}`,
    `No website account found: ${stats.noMatch}`,
    `Ambiguous names (2+ accounts, nothing changed): ${stats.ambiguousNames}`,
    `Incomplete names (no usable last name, nothing changed): ${stats.incompleteNames}`,
  )

  const appendNames = (label: string, names: string[]): void => {
    if (names.length === 0) return

    lines.push('', `${label}:`)
    for (const name of names.slice(0, MAX_LISTED_NAMES)) lines.push(`- ${name}`)
    if (names.length > MAX_LISTED_NAMES)
      lines.push(`- ...and ${names.length - MAX_LISTED_NAMES} more`)
  }

  appendNames('Ambiguous names needing manual review', result.ambiguousNames)
  appendNames('Incomplete names needing manual review', result.incompleteNames)

  if (stats.activeMembers === 0) {
    lines.push('', 'No active memberships were found in this file; no roles were changed.')
  } else if (stats.matchedByName + stats.matchedByEmail === 0) {
    lines.push(
      '',
      'Active members were found, but none matched an existing account. The imported members are stored, and accounts are matched when they first log in.',
    )
  }

  return lines.join('\n')
}

export const logCsvAccountCheckResult = (
  payload: Pick<PayloadLike, 'logger'>,
  result: CsvAccountCheckResult,
): void => {
  payload.logger.info('\n--- Member import summary ---')
  for (const line of result.summary.split('\n')) payload.logger.info(line)
  payload.logger.info('----------------------------\n')
}

export const buildCsvAccountCheckResult = async ({
  payload,
  parsed,
  role = 'susu',
}: {
  payload: PayloadLike
  parsed: MemberCsvParseResult
  role?: MemberRole
}): Promise<CsvAccountCheckResult> => {
  payload.logger.info(
    `Analyzing ${parsed.dataRows} rows (${parsed.members.length} unique members) from a ${parsed.format} export...`,
  )

  const match = await grantRolesForMembers({
    payload,
    members: matchableMembersFromCsv(parsed.members),
    role,
  })

  const result: CsvAccountCheckResult = {
    stats: {
      ...match.stats,
      dataRows: parsed.dataRows,
      invalidRows: parsed.invalidRows,
      duplicateRows: parsed.duplicateRows,
      members: parsed.members.length,
      emailColumnPresent: parsed.emailColumnPresent,
      emailColumnEmpty: parsed.emailColumnEmpty,
    },
    summary: '',
    format: parsed.format,
    headers: parsed.headers,
    ambiguousNames: match.ambiguousNames,
    incompleteNames: match.incompleteNames,
  }

  return { ...result, summary: formatCsvAccountCheckSummary(result) }
}

export const checkCsvAccountsFromContent = async ({
  payload,
  csvContent,
  role = 'susu',
}: {
  payload: PayloadLike
  csvContent: string
  role?: MemberRole
}): Promise<CsvAccountCheckResult> => {
  const parsed = parseMemberCsv(csvContent)
  return buildCsvAccountCheckResult({ payload, parsed, role })
}
