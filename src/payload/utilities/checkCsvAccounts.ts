import fs from 'fs'
import type { Payload } from 'payload'

import {
  fullNameEndpointKey,
  fullNameKey,
  isPlaceholderNamePart,
  type MemberCsvFormat,
  type MemberCsvMember,
  normalizePersonName,
  parseMemberCsv,
} from './memberCsv'
import { normalizeSotonId } from './sotonId'

type MemberRole = 'admin' | 'user' | 'susu'

export interface PayloadLike {
  find: Payload['find']
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

export interface CsvAccountCheckStats {
  dataRows: number
  invalidRows: number
  duplicateRows: number
  members: number
  activeMembers: number
  inactiveSkipped: number
  matchedByEmail: number
  matchedByName: number
  rolesAdded: number
  alreadyHadRole: number
  ambiguousNames: number
  incompleteNames: number
  noMatch: number
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

const displayName = (member: MemberCsvMember): string =>
  `${member.firstName} ${member.lastName}`.trim() || member.userId || '(unnamed row)'

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
    addToIndex(index.byEmail, user.email?.trim().toLowerCase() ?? '', user)
    addToIndex(index.byUsername, normalizeSotonId(user.username), user)
    addToIndex(index.byExactName, normalizePersonName(user.name), user)
    addToIndex(index.byNameEndpoints, fullNameEndpointKey(user.name), user)
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

const resolveMember = (index: UserIndex, member: MemberCsvMember): Resolution => {
  const email = member.email.trim().toLowerCase()

  if (email) {
    const byEmail = uniqueUser(index.byEmail.get(email))
    if (byEmail.user) return { user: byEmail.user, via: 'email' }
    if (byEmail.ambiguous) return { ambiguous: true }

    const byUsername = uniqueUser(index.byUsername.get(normalizeSotonId(email)))
    if (byUsername.user) return { user: byUsername.user, via: 'email' }
    if (byUsername.ambiguous) return { ambiguous: true }
  }

  if (isPlaceholderNamePart(member.firstName) || isPlaceholderNamePart(member.lastName)) {
    return { incomplete: true }
  }

  const exactKey = fullNameKey(member.firstName, member.lastName)
  if (exactKey) {
    const exact = uniqueUser(index.byExactName.get(exactKey))
    if (exact.user) return { user: exact.user, via: 'name' }
    if (exact.ambiguous) return { ambiguous: true }

    const endpointKey = fullNameEndpointKey(exactKey)
    if (endpointKey) {
      const endpoints = uniqueUser(index.byNameEndpoints.get(endpointKey))
      if (endpoints.user) return { user: endpoints.user, via: 'name' }
      if (endpoints.ambiguous) return { ambiguous: true }
    }
  }

  return {}
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
      'Active members were found, but none matched a website account. Members are matched when they first log in, if their name matches.',
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

  payload.logger.info(
    `Analyzing ${parsed.dataRows} rows (${parsed.members.length} unique members) from a ${parsed.format} export...`,
  )

  const index = await loadUserIndex(payload)
  const grantedUsers = new Set<string>()
  const ambiguousNames: string[] = []
  const incompleteNames: string[] = []

  const stats: CsvAccountCheckStats = {
    dataRows: parsed.dataRows,
    invalidRows: parsed.invalidRows,
    duplicateRows: parsed.duplicateRows,
    members: parsed.members.length,
    activeMembers: 0,
    inactiveSkipped: 0,
    matchedByEmail: 0,
    matchedByName: 0,
    rolesAdded: 0,
    alreadyHadRole: 0,
    ambiguousNames: 0,
    incompleteNames: 0,
    noMatch: 0,
    emailColumnPresent: parsed.emailColumnPresent,
    emailColumnEmpty: parsed.emailColumnEmpty,
  }

  for (const member of parsed.members) {
    if (!member.active) {
      stats.inactiveSkipped++
      continue
    }

    stats.activeMembers++

    const resolution = resolveMember(index, member)

    if (!resolution.user) {
      if (resolution.ambiguous) {
        ambiguousNames.push(displayName(member))
      } else if (resolution.incomplete) {
        incompleteNames.push(displayName(member))
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

  const result: CsvAccountCheckResult = {
    stats,
    summary: '',
    format: parsed.format,
    headers: parsed.headers,
    ambiguousNames,
    incompleteNames,
  }

  return { ...result, summary: formatCsvAccountCheckSummary(result) }
}

export const runCheckCsvAccountsFromFile = async ({
  payload,
  csvFilePath,
  role = 'susu',
}: {
  payload: PayloadLike
  csvFilePath: string
  role?: MemberRole
}): Promise<CsvAccountCheckResult> => {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`Could not find CSV file at ${csvFilePath}`)
  }

  const fileContent = decodeCsvBuffer(fs.readFileSync(csvFilePath))
  return checkCsvAccountsFromContent({ payload, csvContent: fileContent, role })
}

/**
 * Used when a user is created (first Azure AD login): checks the most recent
 * import for this one account instead of walking the whole file against the
 * whole user collection.
 */
export const runCheckSingleUserFromCsvFile = async ({
  payload,
  csvFilePath,
  userDoc,
  role = 'susu',
}: {
  payload: PayloadLike
  csvFilePath: string
  userDoc: UserDocLike
  role?: MemberRole
}): Promise<boolean> => {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`Could not find CSV file at ${csvFilePath}`)
  }

  const parsed = parseMemberCsv(decodeCsvBuffer(fs.readFileSync(csvFilePath)))

  const currentRoles = userDoc.roles ?? []
  if (currentRoles.includes(role)) return false

  const userEmail = userDoc.email?.trim().toLowerCase() ?? ''
  const userUsername = normalizeSotonId(userDoc.username)
  const userName = normalizePersonName(userDoc.name)
  const userNameTokenCount = userName.split(' ').filter(Boolean).length
  const userEndpoint = fullNameEndpointKey(userDoc.name)

  if (!userEmail && !userUsername && !userName) return false

  const matchesUser = (member: MemberCsvMember): boolean => {
    const memberEmail = member.email.trim().toLowerCase()
    const memberUsername = normalizeSotonId(memberEmail)

    if (userEmail && memberEmail && memberEmail === userEmail) return true
    if (userUsername && memberUsername && memberUsername === userUsername) return true

    // Never fall back to a first-name-only match: the exports contain rows such
    // as `Tharun .` where the last name carries no information.
    if (userNameTokenCount < 2 || !userEndpoint) return false
    if (isPlaceholderNamePart(member.firstName) || isPlaceholderNamePart(member.lastName)) {
      return false
    }

    const memberFullName = fullNameKey(member.firstName, member.lastName)
    if (!memberFullName) return false
    if (memberFullName === userName) return true

    return fullNameEndpointKey(memberFullName) === userEndpoint
  }

  const matchedMembers = parsed.members.filter(matchesUser)
  if (!matchedMembers.some(member => member.active)) return false

  await payload.update({
    collection: 'users',
    id: userDoc.id,
    data: {
      roles: [...currentRoles, role],
    },
    overrideAccess: true,
  })

  payload.logger.info(
    `Assigned role '${role}' to user ${userEmail || userUsername || String(userDoc.id)}`,
  )

  return true
}
