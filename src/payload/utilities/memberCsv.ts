/**
 * Parser for the membership exports the SUSU website produces.
 *
 * There are currently three shapes in circulation, and the union changes the
 * column order/appearance without notice, so everything is resolved from the
 * header row instead of fixed column positions:
 *
 * - one row per membership (9 columns): `User ID, First Name, Last Name, Email,
 *   Membership ID, Membership Type, Status, Start Date (d/m/Y), End Date (d/m/Y)`
 * - the newer roll-up with the same header
 * - one row per member (8 columns): `User ID, First Name, Last Name, Email,
 *   Memberships Count, Membership Types, Membership Statuses, Membership Date Ranges`
 *   where the type/status/date columns are `|`-separated lists.
 *
 * The Email column is empty in the exports we receive, so email must stay
 * optional: an empty email is not an invalid row.
 *
 * This module is deliberately dependency-free (no `fs`) so it stays safe in the
 * Payload admin config bundle.
 */

export type MemberCsvFormat = 'members' | 'memberships'

export interface MemberCsvMember {
  /** SUSU user id, used only to collapse duplicate rows. Not stored on users. */
  userId: string
  firstName: string
  lastName: string
  email: string
  membershipTypes: string[]
  statuses: string[]
  /** True when at least one membership row for this member is marked active. */
  active: boolean
}

export interface MemberCsvParseResult {
  format: MemberCsvFormat
  headers: string[]
  /** Non-empty data rows read from the file (excludes the header row). */
  dataRows: number
  /** Rows skipped because they carried no usable identity at all. */
  invalidRows: number
  /** Rows merged into an already-seen member. */
  duplicateRows: number
  members: MemberCsvMember[]
  emailColumnPresent: boolean
  emailColumnEmpty: boolean
}

export class MemberCsvFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MemberCsvFormatError'
  }
}

type MemberCsvField = 'email' | 'firstName' | 'lastName' | 'status' | 'type' | 'userId'

const FIELD_ALIASES: Record<MemberCsvField, string[]> = {
  email: ['email', 'emailaddress'],
  firstName: ['firstname', 'forename', 'givenname'],
  lastName: ['lastname', 'surname', 'familyname'],
  status: ['status', 'statuses', 'membershipstatus', 'membershipstatuses'],
  type: ['type', 'membershiptype', 'membershiptypes'],
  userId: ['userid', 'memberid'],
}

const REQUIRED_FIELDS: MemberCsvField[] = ['firstName', 'lastName', 'status']

const FIELD_LABELS: Record<MemberCsvField, string> = {
  email: 'Email',
  firstName: 'First Name',
  lastName: 'Last Name',
  status: 'Status / Membership Statuses',
  type: 'Membership Type(s)',
  userId: 'User ID',
}

/** Lowercases and strips everything that varies between exports (`User ID`, `User-Id`, ...). */
export const normalizeHeader = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** Diacritic- and punctuation-insensitive representation used for name matching. */
export const normalizePersonName = (value?: string | null): string => {
  if (typeof value !== 'string') return ''

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** `Tharun .` and `Joseph -` show up in the exports; those last names are unusable. */
export const isPlaceholderNamePart = (value?: string | null): boolean =>
  normalizePersonName(value) === ''

/** `Grace Brewster Hopper` + `Hopper` -> `grace hopper` when used with first/last names. */
export const fullNameKey = (firstName?: string | null, lastName?: string | null): string =>
  [normalizePersonName(firstName), normalizePersonName(lastName)].filter(Boolean).join(' ')

/**
 * First + last token of a full name (`Dan James Abu-Reish` -> `dan reish`).
 * Handles the common case where the website display name has a middle name but
 * the export does not (or vice versa) once applied to both sides.
 */
export const fullNameEndpointKey = (fullName?: string | null): string => {
  const tokens = normalizePersonName(fullName).split(' ').filter(Boolean)
  if (tokens.length < 2) return ''

  return `${tokens[0]} ${tokens[tokens.length - 1]}`
}

const isActiveStatus = (status: string): boolean => status.trim().toLowerCase() === 'active'

const detectDelimiter = (headerLine: string): string => {
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1

  for (const candidate of candidates) {
    let count = 0
    let inQuotes = false

    for (const char of headerLine) {
      if (char === '"') {
        inQuotes = !inQuotes
        continue
      }

      if (!inQuotes && char === candidate) count++
    }

    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }

  return best
}

/** Quote-aware CSV tokenizer; accepts `\r\n`, `\n` and `\r` line endings. */
export const tokenizeCsv = (raw: string, delimiter: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < raw.length; index++) {
    const char = raw[index]

    if (inQuotes) {
      if (char === '"') {
        if (raw[index + 1] === '"') {
          cell += '"'
          index++
        } else {
          inQuotes = false
        }
        continue
      }

      cell += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === delimiter) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && raw[index + 1] === '\n') index++

      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  rows.push(row)

  return rows
}

const splitList = (value: string): string[] =>
  value
    .split('|')
    .map(item => item.trim())
    .filter(Boolean)

const mergeUnique = (target: string[], values: string[]): void => {
  for (const value of values) {
    if (!target.includes(value)) target.push(value)
  }
}

export const parseMemberCsv = (raw: string): MemberCsvParseResult => {
  const content = raw.replace(/^\uFEFF/, '')

  if (!content.trim()) {
    throw new MemberCsvFormatError(
      'The uploaded file is empty. Expected a SUSU membership CSV with a header row.',
    )
  }

  const firstLine = content.split(/\r\n|\n|\r/).find(line => line.trim() !== '') ?? ''
  const tokenizedRows = tokenizeCsv(content, detectDelimiter(firstLine))
  const rows = tokenizedRows.filter(row => row.some(cell => cell !== ''))

  if (rows.length === 0) {
    throw new MemberCsvFormatError(
      'The uploaded file is empty. Expected a SUSU membership CSV with a header row.',
    )
  }

  const headers = rows[0].map(cell => cell.trim())
  const normalizedHeaders = headers.map(normalizeHeader)

  const findColumn = (field: MemberCsvField): number => {
    const aliases = FIELD_ALIASES[field]
    return normalizedHeaders.findIndex(header => aliases.includes(header))
  }

  const columns: Record<MemberCsvField, number> = {
    email: findColumn('email'),
    firstName: findColumn('firstName'),
    lastName: findColumn('lastName'),
    status: findColumn('status'),
    type: findColumn('type'),
    userId: findColumn('userId'),
  }

  const missing = REQUIRED_FIELDS.filter(field => columns[field] === -1)
  if (missing.length > 0) {
    const found = headers.filter(Boolean).join(', ') || '(no columns found)'
    throw new MemberCsvFormatError(
      `Unrecognised membership CSV: missing ${missing
        .map(field => `"${FIELD_LABELS[field]}"`)
        .join(', ')}. Found columns: ${found}.`,
    )
  }

  const cellAt = (row: string[], field: MemberCsvField): string => {
    const index = columns[field]
    return index === -1 ? '' : row[index] ?? ''
  }

  // The roll-up export uses plural list headers; the per-membership export uses
  // `Status` / `Membership Type`. This only affects the summary wording.
  const format: MemberCsvFormat = headers.some(header => {
    const normalized = normalizeHeader(header)
    return normalized === 'membershipstatuses' || normalized === 'membershipscount'
  })
    ? 'members'
    : 'memberships'

  const membersByKey = new Map<string, MemberCsvMember>()
  let dataRows = 0
  let invalidRows = 0
  let duplicateRows = 0

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    dataRows++

    const userId = cellAt(row, 'userId')
    const firstName = cellAt(row, 'firstName')
    const lastName = cellAt(row, 'lastName')
    const email = cellAt(row, 'email')
    const statuses = splitList(cellAt(row, 'status'))
    const membershipTypes = splitList(cellAt(row, 'type'))
    const nameKey = fullNameKey(firstName, lastName)

    if (!userId && !email && !nameKey) {
      invalidRows++
      continue
    }

    const key = userId ? `u:${userId}` : email ? `e:${email.toLowerCase()}` : `n:${nameKey}`

    const existing = membersByKey.get(key)

    if (!existing) {
      membersByKey.set(key, {
        userId,
        firstName,
        lastName,
        email,
        membershipTypes,
        statuses,
        active: statuses.some(isActiveStatus),
      })
      continue
    }

    duplicateRows++
    existing.active = existing.active || statuses.some(isActiveStatus)
    mergeUnique(existing.statuses, statuses)
    mergeUnique(existing.membershipTypes, membershipTypes)

    if (!existing.email && email) existing.email = email
    if (!existing.firstName && firstName) existing.firstName = firstName
    if (isPlaceholderNamePart(existing.lastName) && !isPlaceholderNamePart(lastName)) {
      existing.lastName = lastName
    }
  }

  const members = [...membersByKey.values()]
  const emailColumnPresent = columns.email !== -1
  const emailColumnEmpty = emailColumnPresent && members.every(member => !member.email)

  return {
    format,
    headers,
    dataRows,
    invalidRows,
    duplicateRows,
    members,
    emailColumnPresent,
    emailColumnEmpty,
  }
}
