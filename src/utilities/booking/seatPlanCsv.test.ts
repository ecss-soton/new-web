import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatSeatPlanCsv, SEAT_PLAN_HEADER_LINE } from './seatPlanCsv'

test('writes the requested columns with blank meal and checks columns', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: 2,
      seatNumber: 2,
      guestName: 'Ada Lovelace',
      allergies: 'Vegan',
      guestType: 'Member',
      ticketHolder: 'Ada Lovelace',
    },
  ])

  const [header, row] = csv.split('\r\n')

  assert.equal(
    header,
    'Table number,Seat number,Guest name,Allergies,Starter,Main,Dessert,Guest type,Ticket holder,Checks before sending',
  )
  assert.equal(row, '2,2,Ada Lovelace,Vegan,,,,Member,Ada Lovelace,')
  assert.equal(SEAT_PLAN_HEADER_LINE, header)
})

test('quotes names containing commas or quotes', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: 3,
      seatNumber: 1,
      guestName: 'Ada "The Countess" Lovelace, Ada',
      guestType: 'Member',
      ticketHolder: 'Ada Lovelace',
    },
  ])

  assert.equal(
    csv.split('\r\n')[1],
    '3,1,"Ada ""The Countess"" Lovelace, Ada",,,,,Member,Ada Lovelace,',
  )
})

test('sorts by table and seat with unplaced guests last', () => {
  const csv = formatSeatPlanCsv([
    { tableNumber: null, seatNumber: null, guestName: 'No Table', guestType: 'Member' },
    { tableNumber: 10, seatNumber: 1, guestName: 'Zoe', guestType: 'Member' },
    { tableNumber: 2, seatNumber: null, guestName: 'Unseated', guestType: 'Member' },
    { tableNumber: 2, seatNumber: 2, guestName: 'Ada', guestType: 'Member' },
    {
      tableNumber: 2,
      seatNumber: 1,
      guestName: "Indigo's +1",
      guestType: 'Plus-one',
      ticketHolder: 'Indigo',
    },
  ])

  assert.deepEqual(
    csv
      .trimEnd()
      .split('\r\n')
      .slice(1)
      .map(line => line.split(',')[2]),
    ["Indigo's +1", 'Ada', 'Unseated', 'Zoe', 'No Table'],
  )
})

test('headers only when there are no guests', () => {
  assert.equal(formatSeatPlanCsv([]), `${SEAT_PLAN_HEADER_LINE}\r\n`)
})

test('leaves table and seat numbers blank for guests without them', () => {
  const csv = formatSeatPlanCsv([
    { tableNumber: null, seatNumber: null, guestName: 'No Table', guestType: 'Member' },
  ])

  assert.equal(csv.split('\r\n')[1], ',,No Table,,,,,Member,,')
})
