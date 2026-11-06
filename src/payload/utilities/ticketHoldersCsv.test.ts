import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  formatTicketHolderCsv,
  MAX_IMPORT_ROWS,
  parseTicketHolderCsv,
  splitCsvLine,
  TICKET_HOLDER_HEADER_LINE,
} from './ticketHoldersCsv'

test('parses the full four-column export', () => {
  const csv = [
    'sotonId,name,plusOneCount,dietaryRequirements',
    'ab1c23,Ada Lovelace,1,Vegan',
    'xy9z88,Alan Turing,0,',
  ].join('\n')

  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.hasHeader, true)
  assert.deepEqual(parsed.errors, [])
  assert.equal(parsed.rows.length, 2)
  assert.deepEqual(parsed.rows[0], {
    lineNumber: 2,
    sotonId: 'ab1c23',
    name: 'Ada Lovelace',
    plusOneCount: 1,
    dietaryRequirements: 'Vegan',
  })
  assert.equal(parsed.rows[1].plusOneCount, 0)
  assert.equal(parsed.rows[1].dietaryRequirements, '')
})

test('accepts a bare list of university usernames', () => {
  const parsed = parseTicketHolderCsv(['ab1c23', 'XY9Z88'].join('\n'))

  assert.equal(parsed.hasHeader, false)
  assert.deepEqual(parsed.errors, [])
  assert.deepEqual(
    parsed.rows.map(row => ({ sotonId: row.sotonId, name: row.name, count: row.plusOneCount })),
    [
      { sotonId: 'ab1c23', name: undefined, count: undefined },
      { sotonId: 'xy9z88', name: undefined, count: undefined },
    ],
  )
})

test('accepts a sotonId + name list with no header', () => {
  const parsed = parseTicketHolderCsv(['ab1c23,Ada Lovelace', 'xy9z88,"Lovelace, Ada"'].join('\n'))

  assert.equal(parsed.hasHeader, false)
  assert.equal(parsed.rows[0].name, 'Ada Lovelace')
  assert.equal(parsed.rows[1].name, 'Lovelace, Ada')
  assert.equal(parsed.rows[1].sotonId, 'xy9z88')
})

test('accepts a header-only sotonId column', () => {
  const parsed = parseTicketHolderCsv(['sotonId', 'ab1c23'].join('\n'))

  assert.equal(parsed.hasHeader, true)
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].sotonId, 'ab1c23')
  assert.equal(parsed.rows[0].name, undefined)
})

test('maps a reordered header by name rather than position', () => {
  const csv = [
    'Name,University Username,Plus-One Count,Dietary',
    'Ada Lovelace,ab1c23,2,Halal',
  ].join('\n')

  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.hasHeader, true)
  assert.deepEqual(parsed.rows[0], {
    lineNumber: 2,
    sotonId: 'ab1c23',
    name: 'Ada Lovelace',
    plusOneCount: 2,
    dietaryRequirements: 'Halal',
  })
})

test('handles quoted commas and escaped quotes in names', () => {
  const csv = [TICKET_HOLDER_HEADER_LINE, 'ab1c23,"Lovelace, Ada",1,"Says ""hi"""'].join('\r\n')

  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.rows[0].name, 'Lovelace, Ada')
  assert.equal(parsed.rows[0].dietaryRequirements, 'Says "hi"')
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ['a', 'b,c', 'd'])
})

test('accepts emails in the sotonId column and normalises case', () => {
  const parsed = parseTicketHolderCsv('AB1C23@soton.ac.uk,Ada')

  assert.equal(parsed.rows[0].sotonId, 'ab1c23')
  assert.equal(parsed.rows[0].name, 'Ada')
})

test('strips a UTF-8 BOM and handles CRLF from Excel', () => {
  const csv = `\uFEFFsotonId,name,plusOneCount,dietaryRequirements\r\nab1c23,Ada,0,\r\n`
  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.hasHeader, true)
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].name, 'Ada')
})

test('accepts tab separated spreadsheet pastes', () => {
  const parsed = parseTicketHolderCsv('ab1c23\tAda Lovelace\t1\tVegan')

  assert.equal(parsed.delimiter, '\t')
  assert.equal(parsed.rows[0].name, 'Ada Lovelace')
  assert.equal(parsed.rows[0].plusOneCount, 1)
  assert.equal(parsed.rows[0].dietaryRequirements, 'Vegan')
})

test('accepts semicolon separated input without commas', () => {
  const parsed = parseTicketHolderCsv('ab1c23;Ada Lovelace;0;')

  assert.equal(parsed.delimiter, ';')
  assert.equal(parsed.rows[0].name, 'Ada Lovelace')
})

test('skips blank lines and # comments', () => {
  const csv = ['# winter ball list', '', 'ab1c23', '   ', 'xy9z88'].join('\n')
  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.rows.length, 2)
  assert.deepEqual(parsed.errors, [])
})

test('reports missing sotonIds without dropping the other rows', () => {
  const csv = [TICKET_HOLDER_HEADER_LINE, ',Ada Lovelace,0,', 'ab1c23,Ada,0,'].join('\n')
  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.errors.length, 1)
  assert.match(parsed.errors[0], /Line 2: missing sotonId/)
  assert.equal(parsed.rows.length, 1)
})

test('clamps plus-one counts to the field bounds and warns', () => {
  const csv = [TICKET_HOLDER_HEADER_LINE, 'ab1c23,Ada,42,', 'xy9z88,Alan,-2,'].join('\n')
  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.rows[0].plusOneCount, 9)
  assert.equal(parsed.rows[1].plusOneCount, 0)
  assert.equal(parsed.warnings.length, 2)
})

test('replaces a plus-one count that is not a number with 0 and warns', () => {
  const csv = [TICKET_HOLDER_HEADER_LINE, 'ab1c23,Ada,loads,'].join('\n')
  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.rows[0].plusOneCount, 0)
  assert.match(parsed.warnings[0], /not a number/)
})

test('keeps the last row for a duplicated sotonId and warns', () => {
  const csv = ['ab1c23,Ada Lovelace,1,', 'xy9z88,Alan Turing,0,', 'AB1C23,Ada L,2,Vegan'].join('\n')
  const parsed = parseTicketHolderCsv(csv)

  assert.equal(parsed.rows.length, 2)
  const ada = parsed.rows.find(row => row.sotonId === 'ab1c23')
  assert.equal(ada?.lineNumber, 3)
  assert.equal(ada?.plusOneCount, 2)
  assert.equal(ada?.dietaryRequirements, 'Vegan')
  assert.match(parsed.warnings[0], /already appeared on line 1/)
})

test('explains a header with no sotonId column', () => {
  const parsed = parseTicketHolderCsv(['Name,Plus-One Count', 'Ada Lovelace,1'].join('\n'))

  assert.equal(parsed.hasHeader, true)
  assert.equal(parsed.rows.length, 0)
  assert.match(parsed.errors[0], /needs a sotonId/)
})

test('rejects an empty paste and a header with no rows', () => {
  assert.match(parseTicketHolderCsv('   \n \n').errors[0], /empty/)
  assert.match(parseTicketHolderCsv(TICKET_HOLDER_HEADER_LINE).errors[0], /no guest rows/)
})

test('rejects a paste above the row limit', () => {
  const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => `ab${index}`)
  const parsed = parseTicketHolderCsv(rows.join('\n'))

  assert.equal(parsed.rows.length, 0)
  assert.match(parsed.errors[0], /limit is/)
})

test('positions an absent plus-one column as not supplied', () => {
  const parsed = parseTicketHolderCsv('ab1c23,Ada Lovelace')

  assert.equal(parsed.rows[0].plusOneCount, undefined)
  assert.equal(parsed.rows[0].dietaryRequirements, undefined)
})

test('formats guests back into the four-column shape, quoting where needed', () => {
  const csv = formatTicketHolderCsv([
    { sotonId: 'AB1C23', name: 'Lovelace, Ada', plusOneCount: 1, dietaryRequirements: 'Say "hi"' },
    { sotonId: 'xy9z88', name: 'Alan Turing', plusOneCount: null, dietaryRequirements: null },
  ])

  assert.equal(
    csv,
    [
      TICKET_HOLDER_HEADER_LINE,
      'ab1c23,"Lovelace, Ada",1,"Say ""hi"""',
      'xy9z88,Alan Turing,0,',
      '',
    ].join('\r\n'),
  )
})

test('round-trips an export through the parser', () => {
  const original = [
    { sotonId: 'ab1c23', name: 'Lovelace, Ada', plusOneCount: 1, dietaryRequirements: 'Vegan' },
    { sotonId: 'xy9z88', name: 'Alan Turing', plusOneCount: 0, dietaryRequirements: '' },
  ]

  const parsed = parseTicketHolderCsv(formatTicketHolderCsv(original))

  assert.deepEqual(parsed.errors, [])
  assert.deepEqual(
    parsed.rows.map(row => ({
      sotonId: row.sotonId,
      name: row.name,
      plusOneCount: row.plusOneCount,
      dietaryRequirements: row.dietaryRequirements,
    })),
    original,
  )
})
