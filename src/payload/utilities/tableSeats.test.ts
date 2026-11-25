import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  currentSeatRows,
  isSeatStale,
  normaliseSeatRows,
  parseSeatRow,
  plusOneCountsByMember,
} from './tableSeats'

test('parses stored seats, including relationship objects', () => {
  assert.deepEqual(
    parseSeatRow({ seatIndex: 2, userId: { id: 'u1' }, plusOneOf: 'u2', name: '  Ada  ' }),
    { seatIndex: 2, userId: 'u1', plusOneOf: 'u2', name: 'Ada' },
  )
  assert.equal(parseSeatRow({ name: 'no index' }), null)
  assert.equal(parseSeatRow(null), null)
  assert.deepEqual(normaliseSeatRows('not an array'), [])
})

test('flags seats belonging to guests who left the table', () => {
  assert.equal(isSeatStale({ seatIndex: 0, userId: 'u1', name: 'A' }, ['u1']), false)
  assert.equal(isSeatStale({ seatIndex: 0, userId: 'gone', name: 'A' }, ['u1']), true)
  assert.equal(isSeatStale({ seatIndex: 0, plusOneOf: 'gone', name: 'A' }, ['u1']), true)
})

test('keeps only the current, in-range, unique seats for a plan', () => {
  const rows = currentSeatRows(
    [
      { seatIndex: 0, userId: 'u1', name: 'A' },
      { seatIndex: 0, userId: 'u1', name: 'A (duplicate)' },
      { seatIndex: 1, userId: 'gone', name: 'Left' },
      { seatIndex: 2, plusOneOf: 'gone', name: 'Left plus-one' },
      { seatIndex: 99, userId: 'u1', name: 'Out of range' },
      { seatIndex: 3, userId: 'u2', name: 'B' },
    ],
    ['u1', 'u2'],
    10,
  )

  assert.deepEqual(
    rows.map(row => [row.seatIndex, row.name]),
    [
      [0, 'A (duplicate)'],
      [3, 'B'],
    ],
  )
})

test('counts plus-one seats per member', () => {
  const counts = plusOneCountsByMember([
    { seatIndex: 0, userId: 'u1', name: 'A' },
    { seatIndex: 1, plusOneOf: 'u1', name: 'A +1' },
    { seatIndex: 2, plusOneOf: 'u1', name: 'A +2' },
    { seatIndex: 3, plusOneOf: 'u2', name: 'B +1' },
  ])

  assert.equal(counts.get('u1'), 2)
  assert.equal(counts.get('u2'), 1)
})
