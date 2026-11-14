import { escapeCsvField } from '../../utilities/booking/csv'
import { normalizeSotonId } from './sotonId'

/**
 * The guest-list CSV is pasted by hand, so it has to accept what people actually
 * have: the full four-column export, a bare list of university usernames, or a
 * username + name list copied out of a spreadsheet (tabs and all).
 *
 * This module is deliberately free of Payload imports so the parse and format
 * rules can be unit-tested and reused by the admin UI without booting a server.
 */

export const TICKET_HOLDER_HEADER = [
  'sotonId',
  'name',
  'plusOneCount',
  'dietaryRequirements',
] as const

export const TICKET_HOLDER_HEADER_LINE = TICKET_HOLDER_HEADER.join(',')

/** Field bounds shared with the `ticket-holders` collection. */
export const MAX_PLUS_ONE_COUNT = 9
/** A paste larger than this is a sign of the wrong file, not a guest list. */
export const MAX_IMPORT_ROWS = 1000

export type TicketHolderCsvMode = 'add' | 'overwrite'

/**
 * `sales` is the SUSU ticket-sales export (Customer / Email / Qty / Status):
 * it is converted into the same rows, with `Qty - 1` as the plus-one count and
 * the `Surname, First` name flipped.
 */
export type TicketHolderCsvFormat = 'guest-list' | 'sales'

export type TicketHolderCsvColumn = (typeof TICKET_HOLDER_HEADER)[number]

export interface ParsedTicketHolderRow {
  /** 1-based line number in the pasted text, for error messages. */
  lineNumber: number
  sotonId: string
  /** `undefined` means the source did not supply a name. */
  name?: string
  /** `undefined` means the source did not supply a plus-one count. */
  plusOneCount?: number
  /** `undefined` means the source did not supply dietary requirements. */
  dietaryRequirements?: string
}

export interface ParsedTicketHolderCsv {
  rows: ParsedTicketHolderRow[]
  errors: string[]
  warnings: string[]
  hasHeader: boolean
  delimiter: ',' | '\t' | ';'
  format: TicketHolderCsvFormat
}

/**
 * Splits one CSV row, honouring double-quoted fields (including escaped `""`).
 * Guest names are the reason this exists — a name like `Lovelace, Ada` would
 * otherwise shift every later column.
 */
export const splitCsvLine = (line: string, delimiter = ','): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields.map(field => field.trim())
}

const HEADER_SYNONYMS: Record<TicketHolderCsvColumn, string[]> = {
  sotonId: [
    'sotonid',
    'sotonusername',
    'universityusername',
    'username',
    'uun',
    'email',
    'emailaddress',
  ],
  name: ['name', 'displayname', 'fullname', 'guestname', 'studentname'],
  plusOneCount: ['plusonecount', 'plusones', 'plusone', 'numberofplusones', 'guestcount'],
  dietaryRequirements: [
    'dietaryrequirements',
    'dietaryrequirement',
    'dietary',
    'dietaryreqs',
    'diet',
  ],
}

/** `"Plus-One Count"` -> `plusonecount`. */
const headerKey = (cell: string): string => cell.toLowerCase().replace(/[^a-z0-9]/g, '')

const columnForHeader = (cell: string): TicketHolderCsvColumn | undefined => {
  const key = headerKey(cell)
  if (!key) return undefined

  for (const column of TICKET_HOLDER_HEADER) {
    if (HEADER_SYNONYMS[column].includes(key)) return column
  }

  return undefined
}

/** Picks the delimiter from the first content line so a spreadsheet paste works. */
const detectDelimiter = (line: string): ',' | '\t' | ';' => {
  if (line.includes('\t')) return '\t'
  if (line.includes(';') && !line.includes(',')) return ';'
  return ','
}

/**
 * `Advincula, Sophia` -> `Sophia Advincula`. A name without a comma is already
 * `First Last`, so it is left alone.
 */
export const flipCustomerName = (raw?: string | null): string | undefined => {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return undefined

  const comma = value.indexOf(',')
  if (comma < 0) return value

  const surname = value.slice(0, comma).trim()
  const given = value.slice(comma + 1).trim()

  if (!surname) return given || undefined
  if (!given) return surname
  return `${given} ${surname}`
}

interface ColumnIndexes {
  sotonId?: number
  name?: number
  plusOneCount?: number
  dietaryRequirements?: number
}

const headerIndexes = (cells: string[]): { indexes: ColumnIndexes; recognised: number } => {
  const indexes: ColumnIndexes = {}
  let recognised = 0

  cells.forEach((cell, index) => {
    const column = columnForHeader(cell)
    if (!column) return
    recognised++
    if (indexes[column] === undefined) indexes[column] = index
  })

  return { indexes, recognised }
}

/** Headerless input is positional: sotonId, name, plusOneCount, dietary. */
const positionalIndexes: ColumnIndexes = {
  sotonId: 0,
  name: 1,
  plusOneCount: 2,
  dietaryRequirements: 3,
}

const parsePlusOneCount = (raw: string, lineNumber: number, warnings: string[]): number => {
  const trimmed = raw.trim()
  if (!trimmed) return 0

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) {
    warnings.push(`Line ${lineNumber}: plus-one count "${trimmed}" is not a number — using 0`)
    return 0
  }

  const clamped = Math.min(MAX_PLUS_ONE_COUNT, Math.max(0, parsed))
  if (clamped !== parsed) {
    warnings.push(
      `Line ${lineNumber}: plus-one count ${parsed} clamped to ${clamped} (allowed 0–${MAX_PLUS_ONE_COUNT})`,
    )
  }
  return clamped
}

interface SalesColumns {
  email: number
  quantity: number
  customer?: number
  status?: number
}

/**
 * The SUSU ticket export is recognisable by its `Email` + `Qty` columns; the
 * leading blank `" "` column is just an artefact of that export. Returns null for
 * any other CSV so the guest-list formats keep their existing behaviour.
 */
const detectSalesColumns = (cells: string[]): SalesColumns | null => {
  const positions = new Map<string, number>()
  cells.forEach((cell, index) => {
    const key = headerKey(cell)
    if (key && !positions.has(key)) positions.set(key, index)
  })

  const email = positions.get('email')
  const quantity = positions.get('qty') ?? positions.get('quantity')
  if (email === undefined || quantity === undefined) return null

  return {
    email,
    quantity,
    customer: positions.get('customer') ?? positions.get('name'),
    status: positions.get('status'),
  }
}

const parseSalesQuantity = (
  raw: string | undefined,
  lineNumber: number,
  warnings: string[],
): number => {
  const trimmed = (raw ?? '').trim()

  if (!trimmed) {
    warnings.push(`Line ${lineNumber}: missing quantity — counted as 1 seat`)
    return 1
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) {
    warnings.push(`Line ${lineNumber}: quantity "${trimmed}" is not a number — counted as 1 seat`)
    return 1
  }

  if (parsed < 1) {
    warnings.push(`Line ${lineNumber}: quantity ${parsed} — counted as 1 seat`)
    return 1
  }

  return parsed
}

const plusOneCountForQuantity = (
  quantity: number,
  lineNumber: number,
  warnings: string[],
): number => {
  const plusOneCount = Math.max(0, quantity - 1)
  const clamped = Math.min(MAX_PLUS_ONE_COUNT, plusOneCount)

  if (clamped !== plusOneCount) {
    warnings.push(
      `Line ${lineNumber}: ${quantity} seats for one buyer — plus-ones capped at ${MAX_PLUS_ONE_COUNT}`,
    )
  }

  return clamped
}

/**
 * Converts SUSU ticket-sales rows into guest rows. A buyer with several orders is
 * one guest whose quantities add up; only `Paid` rows count (unless the file has
 * no Status column at all).
 */
const parseSalesRows = (args: {
  dataLines: string[]
  delimiter: ',' | '\t' | ';'
  columns: SalesColumns
  offset: number
  errors: string[]
  warnings: string[]
}): ParsedTicketHolderRow[] => {
  const { dataLines, delimiter, columns, offset, errors, warnings } = args

  interface Buyer {
    lineNumber: number
    sotonId: string
    name?: string
    quantity: number
  }

  const buyers = new Map<string, Buyer>()
  const skippedStatuses = new Map<string, number>()
  let blankStatusRows = 0

  dataLines.forEach((line, index) => {
    const lineNumber = index + offset
    const cells = splitCsvLine(line, delimiter)
    const cellAt = (columnIndex?: number): string | undefined => {
      if (columnIndex === undefined || columnIndex >= cells.length) return undefined
      return cells[columnIndex]
    }

    const email = cellAt(columns.email) ?? ''
    const sotonId = normalizeSotonId(email)
    if (!sotonId) {
      errors.push(`Line ${lineNumber}: missing email`)
      return
    }

    const status = (cellAt(columns.status) ?? '').trim()
    if (status && status.toLowerCase() !== 'paid') {
      skippedStatuses.set(status, (skippedStatuses.get(status) ?? 0) + 1)
      return
    }
    if (!status && columns.status !== undefined) blankStatusRows++

    if (!email.trim().toLowerCase().endsWith('@soton.ac.uk')) {
      warnings.push(
        `Line ${lineNumber}: "${email.trim()}" is not a @soton.ac.uk address — using "${sotonId}" as the username`,
      )
    }

    const quantity = parseSalesQuantity(cellAt(columns.quantity), lineNumber, warnings)
    const name = flipCustomerName(cellAt(columns.customer))

    const existing = buyers.get(sotonId)
    if (existing) {
      existing.quantity += quantity
      if (!existing.name && name) existing.name = name
      return
    }

    buyers.set(sotonId, { lineNumber, sotonId, name, quantity })
  })

  if (skippedStatuses.size > 0) {
    const breakdown = [...skippedStatuses.entries()]
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ')
    const skipped = [...skippedStatuses.values()].reduce((total, count) => total + count, 0)
    warnings.push(`Skipped ${skipped} non-Paid row(s) (${breakdown})`)
  }

  if (blankStatusRows > 0) {
    warnings.push(`Included ${blankStatusRows} row(s) with no status`)
  }

  return [...buyers.values()].map(buyer => ({
    lineNumber: buyer.lineNumber,
    sotonId: buyer.sotonId,
    name: buyer.name,
    plusOneCount: plusOneCountForQuantity(buyer.quantity, buyer.lineNumber, warnings),
    dietaryRequirements: undefined,
  }))
}

/**
 * Parses a pasted guest list. Row-level problems are reported in `errors` while
 * the remaining rows still parse, so one bad line never loses a whole paste.
 */
export const parseTicketHolderCsv = (csv: string): ParsedTicketHolderCsv => {
  const errors: string[] = []
  const warnings: string[] = []

  // Excel saves CSV as UTF-8 with a BOM; without stripping it the first header
  // cell is `\uFEFFsotonId` and header detection fails.
  const text = typeof csv === 'string' ? csv.replace(/^\uFEFF/, '') : ''

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))

  if (lines.length === 0) {
    return {
      rows: [],
      errors: ['CSV is empty'],
      warnings: [],
      hasHeader: false,
      delimiter: ',',
      format: 'guest-list',
    }
  }

  const delimiter = detectDelimiter(lines[0])
  const firstCells = splitCsvLine(lines[0], delimiter)

  // The SUSU ticket-sales export has its own columns and semantics, so it is
  // recognised before the guest-list header mapping (which would read Email as
  // the username and ignore Qty).
  const salesColumns = detectSalesColumns(firstCells)

  if (salesColumns) {
    const dataLines = lines.slice(1)

    if (dataLines.length === 0) {
      return {
        rows: [],
        errors: ['CSV has a header but no ticket rows'],
        warnings: [],
        hasHeader: true,
        delimiter,
        format: 'sales',
      }
    }

    if (dataLines.length > MAX_IMPORT_ROWS) {
      return {
        rows: [],
        errors: [`CSV has ${dataLines.length} rows; the limit is ${MAX_IMPORT_ROWS}`],
        warnings: [],
        hasHeader: true,
        delimiter,
        format: 'sales',
      }
    }

    const salesRows = parseSalesRows({
      dataLines,
      delimiter,
      columns: salesColumns,
      offset: 2,
      errors,
      warnings,
    })

    if (salesRows.length === 0 && errors.length === 0) {
      errors.push('No rows in the SUSU ticket export were marked Paid')
    }

    return {
      rows: salesRows,
      errors,
      warnings,
      hasHeader: true,
      delimiter,
      format: 'sales',
    }
  }

  const { indexes: detected, recognised } = headerIndexes(firstCells)
  const hasHeader = detected.sotonId !== undefined || recognised >= 2
  const indexes = hasHeader ? detected : positionalIndexes
  const dataLines = hasHeader ? lines.slice(1) : lines

  if (dataLines.length === 0) {
    return {
      rows: [],
      errors: ['CSV has a header but no guest rows'],
      warnings: [],
      hasHeader,
      delimiter,
      format: 'guest-list',
    }
  }

  if (hasHeader && indexes.sotonId === undefined) {
    return {
      rows: [],
      errors: ['CSV header needs a sotonId (or username/email) column'],
      warnings: [],
      hasHeader,
      delimiter,
      format: 'guest-list',
    }
  }

  if (dataLines.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [`CSV has ${dataLines.length} rows; the limit is ${MAX_IMPORT_ROWS}`],
      warnings: [],
      hasHeader,
      delimiter,
      format: 'guest-list',
    }
  }

  const bySotonId = new Map<string, ParsedTicketHolderRow>()
  const offset = hasHeader ? 2 : 1

  dataLines.forEach((line, index) => {
    const lineNumber = index + offset
    const cells = splitCsvLine(line, delimiter)

    const cellAt = (columnIndex: number | undefined): string | undefined => {
      if (columnIndex === undefined) return undefined
      if (columnIndex >= cells.length) return undefined
      return cells[columnIndex]
    }

    const sotonId = normalizeSotonId(cellAt(indexes.sotonId))
    if (!sotonId) {
      errors.push(`Line ${lineNumber}: missing sotonId`)
      return
    }

    const rawName = cellAt(indexes.name)
    const name = rawName && rawName.length > 0 ? rawName : undefined

    const rawCount = cellAt(indexes.plusOneCount)
    const plusOneCount =
      rawCount === undefined ? undefined : parsePlusOneCount(rawCount, lineNumber, warnings)

    const rawDietary = cellAt(indexes.dietaryRequirements)
    const dietaryRequirements = rawDietary === undefined ? undefined : rawDietary

    const previous = bySotonId.get(sotonId)
    if (previous) {
      warnings.push(
        `Line ${lineNumber}: ${sotonId} already appeared on line ${previous.lineNumber} — this row wins`,
      )
    }

    bySotonId.set(sotonId, {
      lineNumber,
      sotonId,
      name,
      plusOneCount,
      dietaryRequirements,
    })
  })

  return {
    rows: [...bySotonId.values()],
    errors,
    warnings,
    hasHeader,
    delimiter,
    format: 'guest-list',
  }
}

/**
 * Serialises guests into the same four-column shape the importer accepts, so an
 * exported file can be edited and imported again without ceremony.
 */
export const formatTicketHolderCsv = (
  holders: Array<{
    sotonId?: string | null
    name?: string | null
    plusOneCount?: number | null
    dietaryRequirements?: string | null
  }>,
): string => {
  const lines = [TICKET_HOLDER_HEADER_LINE]

  for (const holder of holders) {
    lines.push(
      [
        normalizeSotonId(holder.sotonId),
        holder.name ?? '',
        String(holder.plusOneCount ?? 0),
        holder.dietaryRequirements ?? '',
      ]
        .map(value => escapeCsvField(String(value)))
        .join(','),
    )
  }

  // CRLF keeps Excel happy; the parser accepts either line ending.
  return `${lines.join('\r\n')}\r\n`
}
