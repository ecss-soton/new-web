import { isSeatIndexValid, type SeatRow } from '../../utilities/booking/seats'
import { relationshipId } from './relationships'

/**
 * Normalisation and validity rules for the seats stored on a table. These are the
 * single definition of "a current seat", shared by the seats endpoint, the
 * seat-plan export and the leave/remove-member paths.
 */

/** Parses one stored seat row; null when it has no usable seat index. */
export const parseSeatRow = (value: unknown): SeatRow | null => {
  if (!value || typeof value !== 'object') return null

  const seat = value as {
    seatIndex?: unknown
    userId?: unknown
    plusOneOf?: unknown
    name?: unknown
  }

  if (!Number.isInteger(seat.seatIndex)) return null

  const userId = relationshipId(seat.userId)
  const plusOneOf = relationshipId(seat.plusOneOf)

  return {
    seatIndex: seat.seatIndex as number,
    // Omit absent relationships so stored seat rows stay clean.
    ...(userId ? { userId } : {}),
    ...(plusOneOf ? { plusOneOf } : {}),
    name: typeof seat.name === 'string' ? seat.name.trim() : '',
  }
}

export const normaliseSeatRows = (values: unknown): SeatRow[] =>
  Array.isArray(values)
    ? values.map(parseSeatRow).filter((seat): seat is SeatRow => seat !== null)
    : []

/** A seat pointing at someone who has left the table is stale and must be dropped. */
export const isSeatStale = (seat: SeatRow, memberIds: string[]): boolean =>
  Boolean(
    (seat.userId && !memberIds.includes(seat.userId)) ||
      (seat.plusOneOf && !memberIds.includes(seat.plusOneOf)),
  )

/**
 * The seats worth showing or exporting: inside the seat bounds, belonging to
 * current members, unique per seat index (a later row wins, matching how the plan
 * renders slots). Sorted by seat number.
 */
export const currentSeatRows = (
  values: unknown,
  memberIds: string[],
  seatsPerTable: number,
): SeatRow[] => {
  const byIndex = new Map<number, SeatRow>()

  for (const seat of normaliseSeatRows(values)) {
    if (!isSeatIndexValid(seat.seatIndex, seatsPerTable)) continue
    if (isSeatStale(seat, memberIds)) continue
    byIndex.set(seat.seatIndex, seat)
  }

  return [...byIndex.values()].sort((a, b) => a.seatIndex - b.seatIndex)
}

/** How many plus-one seats each member currently has on the plan. */
export const plusOneCountsByMember = (seats: SeatRow[]): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const seat of seats) {
    if (!seat.plusOneOf) continue
    counts.set(seat.plusOneOf, (counts.get(seat.plusOneOf) ?? 0) + 1)
  }
  return counts
}
