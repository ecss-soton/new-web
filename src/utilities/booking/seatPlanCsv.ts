import { escapeCsvField } from './csv'

/**
 * The venue seating plan: one row per person, with the table and seat numbers
 * shown on the booking pages. Meal choices and the final "checks" column are
 * left blank for the committee to fill in before sending it on.
 */

export const SEAT_PLAN_HEADER = [
  'Table number',
  'Seat number',
  'Guest name',
  'Allergies',
  'Starter',
  'Main',
  'Dessert',
  'Guest type',
  'Ticket holder',
  'Checks before sending',
] as const

export const SEAT_PLAN_HEADER_LINE = SEAT_PLAN_HEADER.join(',')

export type SeatPlanGuestType = 'Member' | 'Plus-one' | 'Guest'

export interface SeatPlanRow {
  /** null/undefined when the guest has not joined a table at all. */
  tableNumber?: number | null
  /** null/undefined when the guest has not picked a seat yet. */
  seatNumber?: number | null
  guestName: string
  allergies?: string | null
  guestType: SeatPlanGuestType
  /** The person who holds the ticket (themselves for members, the member for plus-ones). */
  ticketHolder?: string | null
}

const sortValue = (value?: number | null): number =>
  value === null || value === undefined ? Number.MAX_SAFE_INTEGER : value

/** Table order, then seat order, with unplaced guests after the seated ones. */
const compareRows = (a: SeatPlanRow, b: SeatPlanRow): number =>
  sortValue(a.tableNumber) - sortValue(b.tableNumber) ||
  sortValue(a.seatNumber) - sortValue(b.seatNumber) ||
  a.guestName.localeCompare(b.guestName)

export const formatSeatPlanCsv = (rows: SeatPlanRow[]): string => {
  const lines = [SEAT_PLAN_HEADER_LINE]

  for (const row of [...rows].sort(compareRows)) {
    lines.push(
      [
        row.tableNumber === null || row.tableNumber === undefined ? '' : String(row.tableNumber),
        row.seatNumber === null || row.seatNumber === undefined ? '' : String(row.seatNumber),
        row.guestName,
        row.allergies ?? '',
        '',
        '',
        '',
        row.guestType,
        row.ticketHolder ?? '',
        '',
      ]
        .map(escapeCsvField)
        .join(','),
    )
  }

  // CRLF keeps Excel happy; the guest-list parser accepts either line ending.
  return `${lines.join('\r\n')}\r\n`
}
