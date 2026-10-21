import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  fullNameEndpointKey,
  fullNameKey,
  isPlaceholderNamePart,
  MemberCsvFormatError,
  normalizePersonName,
  parseMemberCsv,
} from './memberCsv'

const MEMBERSHIPS_HEADER =
  'User ID,First Name,Last Name,Email,Membership ID,Membership Type,Status,Start Date (d/m/Y),End Date (d/m/Y)'

const MEMBERS_HEADER =
  'User ID,First Name,Last Name,Email,Memberships Count,Membership Types,Membership Statuses,Membership Date Ranges'

test('parses the one-row-per-membership export and collapses duplicate rows', () => {
  const csv = [
    MEMBERSHIPS_HEADER,
    '1,Ada,Lovelace,,10,ECS Membership,active,01/09/2026,31/08/2027',
    '1,Ada,Lovelace,,9,ECS Membership,expired,01/09/2025,31/08/2026',
    '2,Alan,Turing,,11,ECS Membership,expired,01/09/2024,01/09/2025',
    '3,Grace,Hopper,,12,ECS Membership,Active,01/09/2026,31/08/2027',
  ].join('\n')

  const parsed = parseMemberCsv(csv)

  assert.equal(parsed.format, 'memberships')
  assert.equal(parsed.dataRows, 4)
  assert.equal(parsed.duplicateRows, 1)
  assert.equal(parsed.invalidRows, 0)
  assert.equal(parsed.members.length, 3)

  const ada = parsed.members.find(member => member.firstName === 'Ada')
  assert.deepEqual(ada?.statuses.sort(), ['active', 'expired'])
  assert.equal(ada?.active, true)

  const alan = parsed.members.find(member => member.firstName === 'Alan')
  assert.equal(alan?.active, false)

  const grace = parsed.members.find(member => member.firstName === 'Grace')
  assert.equal(grace?.active, true)
})

test('parses the roll-up export where statuses are pipe-separated lists', () => {
  const csv = [
    MEMBERS_HEADER,
    '4,Katherine,Johnson,,2,Year Membership 26/27 | ECS Membership,active | expired,01/09/2026 – 31/08/2027 | 01/09/2025 – 31/08/2026',
    '5,Dorothy,Vaughan,,1,ECS Membership,expired,01/09/2025 – 31/08/2026',
  ].join('\n')

  const parsed = parseMemberCsv(csv)

  assert.equal(parsed.format, 'members')
  assert.equal(parsed.members.length, 2)
  assert.equal(parsed.members[0].active, true)
  assert.deepEqual(parsed.members[0].membershipTypes, ['Year Membership 26/27', 'ECS Membership'])
  assert.equal(parsed.members[1].active, false)
})

test('handles BOM, CRLF, quoted values and an empty email column', () => {
  const csv = ['\uFEFFUser ID,First Name,Last Name,Email,Status', '6,Ada,"Smith, Jr",,active'].join(
    '\r\n',
  )

  const parsed = parseMemberCsv(csv)

  assert.equal(parsed.members.length, 1)
  assert.equal(parsed.members[0].lastName, 'Smith, Jr')
  assert.equal(parsed.members[0].email, '')
  assert.equal(parsed.emailColumnPresent, true)
  assert.equal(parsed.emailColumnEmpty, true)
})

test('detects a semicolon delimiter', () => {
  const csv = [
    'User ID;First Name;Last Name;Email;Status',
    '7;Ada;Byron;ada@example.com;active',
  ].join('\n')

  const parsed = parseMemberCsv(csv)

  assert.equal(parsed.members.length, 1)
  assert.equal(parsed.members[0].email, 'ada@example.com')
  assert.equal(parsed.members[0].active, true)
})

test('matches headers regardless of case, spacing and aliases', () => {
  const csv = [
    'user-id, first name , surname , e-mail , membership status ',
    '8,Ada,Byron,ada@example.com,active',
  ].join('\n')

  const parsed = parseMemberCsv(csv)

  assert.equal(parsed.members.length, 1)
  assert.equal(parsed.members[0].firstName, 'Ada')
  assert.equal(parsed.members[0].lastName, 'Byron')
})

test('reports unusable rows without failing the whole import', () => {
  const csv = [
    'User ID,First Name,Last Name,Email,Status',
    ',,,,active',
    '9,Ada,Byron,,active',
  ].join('\n')

  const parsed = parseMemberCsv(csv)

  assert.equal(parsed.invalidRows, 1)
  assert.equal(parsed.members.length, 1)
})

test('throws a descriptive error for an unrecognised header row', () => {
  assert.throws(
    () => parseMemberCsv('foo,bar\n1,2'),
    (error: unknown) => {
      assert.ok(error instanceof MemberCsvFormatError)
      assert.match(error.message, /First Name/)
      assert.match(error.message, /Last Name/)
      assert.match(error.message, /Found columns: foo, bar/)
      return true
    },
  )
})

test('throws for an empty file', () => {
  assert.throws(() => parseMemberCsv('   \n'), MemberCsvFormatError)
})

test('normalises names for matching', () => {
  assert.equal(normalizePersonName("  Áda  O'Brien-Lovelace "), 'ada o brien lovelace')
  assert.equal(fullNameKey('Dan', 'Abu-Reish'), 'dan abu reish')
  assert.equal(fullNameKey('  Dan ', ' Abu   Reish '), 'dan abu reish')
  assert.equal(fullNameEndpointKey('Dan James Abu-Reish'), 'dan reish')
  assert.equal(fullNameEndpointKey(fullNameKey('Dan', 'Abu Reish')), 'dan reish')
})

test('recognises placeholder name parts', () => {
  assert.equal(isPlaceholderNamePart('.'), true)
  assert.equal(isPlaceholderNamePart('-'), true)
  assert.equal(isPlaceholderNamePart('   '), true)
  assert.equal(isPlaceholderNamePart('Abu Reish'), false)
})
