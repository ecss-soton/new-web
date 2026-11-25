import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isSeatIndexValid, plusOneSeatNames, plusOneStateFor } from './seats'

test('validates seat indexes against the table size', () => {
  assert.equal(isSeatIndexValid(0, 10), true)
  assert.equal(isSeatIndexValid(9, 10), true)
  assert.equal(isSeatIndexValid(10, 10), false)
  assert.equal(isSeatIndexValid(-1, 10), false)
  assert.equal(isSeatIndexValid(1.5, 10), false)
  assert.equal(isSeatIndexValid('1', 10), false)
})

test('summarises plus-one usage per member', () => {
  const state = plusOneStateFor(
    [
      { id: 'a', plusOneCount: 2 },
      { id: 'b', plusOneCount: 0 },
    ],
    [null, { plusOneOf: 'a' }, { plusOneOf: 'a' }, { plusOneOf: 'b' }],
  )

  assert.deepEqual(state.get('a'), { placed: 2, remaining: 0 })
  assert.deepEqual(state.get('b'), { placed: 1, remaining: 0 })
})

test('names plus-one seats in seat order within each member', () => {
  const names = plusOneSeatNames(
    [
      { seatIndex: 5, plusOneOf: 'a' },
      { seatIndex: 2, plusOneOf: 'a' },
      { seatIndex: 4, plusOneOf: 'b' },
      { seatIndex: 3, userId: 'a' },
    ],
    memberId => (memberId === 'a' ? 'Indigo' : 'Sam'),
  )

  assert.equal(names.get(2), "Indigo's +1")
  assert.equal(names.get(5), "Indigo's +2")
  assert.equal(names.get(4), "Sam's +1")
  assert.equal(names.has(3), false)
})
