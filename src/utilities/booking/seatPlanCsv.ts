import { escapeCsvField } from './csv'

/**
 * The venue seating plan: one row per person with the table and seat numbers shown
 * on the booking pages, whether they are a normal ticket or a plus-one, who holds
 * the ticket, and the guest's university username.
 *
 * Allergies, meal choices and pre-send checks are collected separately later, so
 * this export deliberately leaves them out.
 */

export const SEAT_PLAN_HEADER = [
  'Table number',
  'Seat number',
  'Guest name',
  'Guest type',
  'Ticket holder',
  'SotonID',
] as const

export const SEAT_PLAN_HEADER_LINE = SEAT_PLAN_HEADER.join(',')

/** Plus-ones are identified by their ticket holder, so their guest name is blank. */
export type SeatPlanGuestType = 'normal' | 'plusone'

export interface SeatPlanRow {
  /** null/undefined when the guest has not joined a table at all. */
  tableNumber?: number | null
  /** null/undefined when the guest has not picked a seat yet. */
  seatNumber?: number | null
  guestName?: string | null
  guestType: SeatPlanGuestType
  /** The person who holds the ticket (themselves for members, the member for plus-ones). */
  ticketHolder?: string | null
  /** The guest's university username; blank for plus-ones and legacy seats. */
  sotonId?: string | null
}

const sortValue = (value?: number | null): number =>
  value === null || value === undefined ? Number.MAX_SAFE_INTEGER : value

/** Table order, then seat order, keeping each ticket holder's guests together. */
const compareRows = (a: SeatPlanRow, b: SeatPlanRow): number =>
  sortValue(a.tableNumber) - sortValue(b.tableNumber) ||
  sortValue(a.seatNumber) - sortValue(b.seatNumber) ||
  (a.ticketHolder ?? '').localeCompare(b.ticketHolder ?? '') ||
  (a.guestName ?? '').localeCompare(b.guestName ?? '')

export const formatSeatPlanCsv = (rows: SeatPlanRow[]): string => {
  const lines = [SEAT_PLAN_HEADER_LINE]

  for (const row of [...rows].sort(compareRows)) {
    lines.push(
      [
        row.tableNumber === null || row.tableNumber === undefined ? '' : String(row.tableNumber),
        row.seatNumber === null || row.seatNumber === undefined ? '' : String(row.seatNumber),
        row.guestName ?? '',
        row.guestType,
        row.ticketHolder ?? '',
        row.sotonId ?? '',
      ]
        .map(escapeCsvField)
        .join(','),
    )
  }

  // CRLF keeps Excel happy; the guest-list parser accepts either line ending.
  return `${lines.join('\r\n')}\r\n`
}
