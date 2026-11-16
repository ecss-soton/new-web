import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatSeatPlanCsv, SEAT_PLAN_HEADER_LINE } from './seatPlanCsv'

test('writes the six requested columns', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: 2,
      seatNumber: 2,
      guestName: 'Ada Lovelace',
      guestType: 'normal',
      ticketHolder: 'Ada Lovelace',
      sotonId: 'ab1c23',
    },
  ])

  const [header, row] = csv.split('\r\n')

  assert.equal(header, 'Table number,Seat number,Guest name,Guest type,Ticket holder,SotonID')
  assert.equal(SEAT_PLAN_HEADER_LINE, header)
  assert.equal(row, '2,2,Ada Lovelace,normal,Ada Lovelace,ab1c23')
})

test('quotes names containing commas or quotes', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: 3,
      seatNumber: 1,
      guestName: 'Ada "The Countess" Lovelace, Ada',
      guestType: 'normal',
      ticketHolder: 'Ada Lovelace',
      sotonId: 'ab1c23',
    },
  ])

  assert.equal(
    csv.split('\r\n')[1],
    '3,1,"Ada ""The Countess"" Lovelace, Ada",normal,Ada Lovelace,ab1c23',
  )
})

test('leaves plus-one guest names and SotonIDs blank', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: 1,
      seatNumber: 2,
      guestName: '',
      guestType: 'plusone',
      ticketHolder: 'Indigo Rivers',
      sotonId: '',
    },
  ])

  assert.equal(csv.split('\r\n')[1], '1,2,,plusone,Indigo Rivers,')
})

test('sorts by table and seat with unplaced guests last', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: null,
      seatNumber: null,
      guestName: 'No Table',
      guestType: 'normal',
      ticketHolder: 'No Table',
      sotonId: 'zz1x23',
    },
    {
      tableNumber: 10,
      seatNumber: 1,
      guestName: 'Zoe',
      guestType: 'normal',
      ticketHolder: 'Zoe',
      sotonId: 'zo1x23',
    },
    {
      tableNumber: 2,
      seatNumber: null,
      guestName: 'Unseated',
      guestType: 'normal',
      ticketHolder: 'Unseated',
      sotonId: 'un1x23',
    },
    {
      tableNumber: 2,
      seatNumber: 2,
      guestName: 'Ada',
      guestType: 'normal',
      ticketHolder: 'Ada',
      sotonId: 'ab1c23',
    },
    {
      tableNumber: 2,
      seatNumber: 1,
      guestName: '',
      guestType: 'plusone',
      ticketHolder: 'Indigo',
      sotonId: '',
    },
  ])

  assert.deepEqual(
    csv
      .trimEnd()
      .split('\r\n')
      .slice(1)
      .map(line => line.split(',')[2]),
    ['', 'Ada', 'Unseated', 'Zoe', 'No Table'],
  )
})

test('headers only when there are no guests', () => {
  assert.equal(formatSeatPlanCsv([]), `${SEAT_PLAN_HEADER_LINE}\r\n`)
})

test('leaves table and seat numbers blank for guests without them', () => {
  const csv = formatSeatPlanCsv([
    {
      tableNumber: null,
      seatNumber: null,
      guestName: 'No Table',
      guestType: 'normal',
      ticketHolder: 'No Table',
      sotonId: 'zz1x23',
    },
  ])

  assert.equal(csv.split('\r\n')[1], ',,No Table,normal,No Table,zz1x23')
})
