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
    }
  }

  const delimiter = detectDelimiter(lines[0])
  const firstCells = splitCsvLine(lines[0], delimiter)
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
    }
  }

  if (hasHeader && indexes.sotonId === undefined) {
    return {
      rows: [],
      errors: ['CSV header needs a sotonId (or username/email) column'],
      warnings: [],
      hasHeader,
      delimiter,
    }
  }

  if (dataLines.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [`CSV has ${dataLines.length} rows; the limit is ${MAX_IMPORT_ROWS}`],
      warnings: [],
      hasHeader,
      delimiter,
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
  }
}

const escapeCsvField = (value: string): string => {
  if (!/[",\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
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
