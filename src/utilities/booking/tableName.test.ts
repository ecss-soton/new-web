import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  firstNameOf,
  normalizeTableNameMode,
  plusOneSeatLabel,
  tableDisplayName,
} from './tableName'

test('takes the first name from a display name', () => {
  assert.equal(firstNameOf('Indigo Rivers', undefined), 'Indigo')
  assert.equal(firstNameOf('  Indigo   Rivers  '), 'Indigo')
  assert.equal(firstNameOf('Indigo'), 'Indigo')
})

test('falls back to the username when no name is stored', () => {
  assert.equal(firstNameOf('', 'ijr1g26'), 'ijr1g26')
  assert.equal(firstNameOf(null, 'ijr1g26'), 'ijr1g26')
  assert.equal(firstNameOf(undefined, undefined), '')
})

test('names a table after its owner by default', () => {
  assert.equal(
    tableDisplayName({ joinCode: 'ABCD2345', ownerName: 'Indigo Rivers' }),
    "Indigo's Table",
  )
  assert.equal(
    tableDisplayName({ nameMode: 'ownerName', joinCode: 'ABCD2345', ownerName: 'Indigo Rivers' }),
    "Indigo's Table",
  )
  assert.equal(
    tableDisplayName({ nameMode: null, joinCode: 'ABCD2345', ownerName: 'Indigo' }),
    "Indigo's Table",
  )
})

test('switches back to the join code when asked', () => {
  assert.equal(
    tableDisplayName({ nameMode: 'joinCode', joinCode: 'ABCD2345', ownerName: 'Indigo Rivers' }),
    'Table ABCD2345',
  )
})

test('falls back to the join code when the owner has no name', () => {
  assert.equal(tableDisplayName({ joinCode: 'ABCD2345' }), 'Table ABCD2345')
  assert.equal(tableDisplayName({ joinCode: 'ABCD2345', ownerName: '   ' }), 'Table ABCD2345')
})

test('normalises an unknown or legacy mode to the owner name', () => {
  assert.equal(normalizeTableNameMode(undefined), 'ownerName')
  assert.equal(normalizeTableNameMode('nonsense'), 'ownerName')
  assert.equal(normalizeTableNameMode('ownerName'), 'ownerName')
  assert.equal(normalizeTableNameMode('joinCode'), 'joinCode')
})

test('labels plus-one seats from the member first name', () => {
  assert.equal(plusOneSeatLabel('Indigo', 1), "Indigo's +1")
  assert.equal(plusOneSeatLabel('Indigo', 2), "Indigo's +2")
  // Out-of-range positions are clamped so a label can never be empty.
  assert.equal(plusOneSeatLabel('Indigo', 0), "Indigo's +1")
  assert.equal(plusOneSeatLabel('', 1), 'Plus-one +1')
})
