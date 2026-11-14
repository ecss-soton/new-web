import assert from 'node:assert/strict'
import { test } from 'node:test'

import { rankTables } from './tableNumbers'

test('numbers tables in creation order', () => {
  const ranks = rankTables([
    { id: 'c', createdAt: '2025-11-03T10:00:00.000Z' },
    { id: 'a', createdAt: '2025-11-01T10:00:00.000Z' },
    { id: 'b', createdAt: '2025-11-02T10:00:00.000Z' },
  ])

  assert.equal(ranks.get('a'), 1)
  assert.equal(ranks.get('b'), 2)
  assert.equal(ranks.get('c'), 3)
})

test('breaks identical timestamps by id so numbering is stable', () => {
  const tables = [
    { id: 'table-b', createdAt: '2025-11-01T10:00:00.000Z' },
    { id: 'table-a', createdAt: '2025-11-01T10:00:00.000Z' },
  ]

  assert.equal(rankTables(tables).get('table-a'), 1)
  assert.equal(rankTables(tables).get('table-b'), 2)
})

test('treats a missing createdAt as first and does not mutate the input', () => {
  const tables = [{ id: 'later', createdAt: '2025-11-02T10:00:00.000Z' }, { id: 'no-date' }]
  const ranks = rankTables(tables)

  assert.equal(ranks.get('no-date'), 1)
  assert.equal(ranks.get('later'), 2)
  assert.deepEqual(
    tables.map(table => table.id),
    ['later', 'no-date'],
  )
})

test('numbers nothing when there are no tables', () => {
  assert.equal(rankTables([]).size, 0)
})
