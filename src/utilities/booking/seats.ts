import { plusOneSeatLabel } from './tableName'

/**
 * Seat plan primitives shared by the save endpoint, the API and the seat plan UI,
 * so the "what counts as a seat" rules cannot drift between them.
 */

/** A seat as stored on a table or submitted to the API. Index is 0-based. */
export interface SeatRow {
  seatIndex: number
  userId?: string | null
  plusOneOf?: string | null
  name: string
}

/** A filled seat on the rendered plan; the array index is the seat number - 1. */
export type SeatSlot = { userId: string | null; plusOneOf?: string | null; name: string } | null

/** A seat as sent by the client. Names are derived server-side. */
export interface SeatAssignment {
  seatIndex: number
  userId?: string
  plusOneOf?: string
  name?: string
}

/** Seat indexes are zero-based; their bounds come from the event's seatsPerTable. */
export const isSeatIndexValid = (value: unknown, seatsPerTable: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < seatsPerTable

export interface PlusOneState {
  placed: number
  remaining: number
}

/** How much of each member's plus-one allowance the current plan uses. */
export const plusOneStateFor = (
  members: Array<{ id: string; plusOneCount?: number | null }>,
  seats: ReadonlyArray<{ plusOneOf?: string | null } | null | undefined>,
): Map<string, PlusOneState> => {
  const placedByMember = new Map<string, number>()
  for (const seat of seats) {
    if (!seat?.plusOneOf) continue
    placedByMember.set(seat.plusOneOf, (placedByMember.get(seat.plusOneOf) ?? 0) + 1)
  }

  const state = new Map<string, PlusOneState>()
  for (const member of members) {
    const placed = placedByMember.get(member.id) ?? 0
    const allowance = Math.max(0, member.plusOneCount ?? 0)
    state.set(member.id, { placed, remaining: Math.max(0, allowance - placed) })
  }
  return state
}

/**
 * Display names for plus-one seats (`Indigo's +1`), numbered by seat order within
 * each member. The save endpoint and the seat plan both use this so the names they
 * show always agree.
 */
export const plusOneSeatNames = (
  seats: ReadonlyArray<{ seatIndex: number; userId?: string | null; plusOneOf?: string | null }>,
  firstNameFor: (memberId: string) => string,
): Map<number, string> => {
  const indexesByMember = new Map<string, number[]>()
  for (const seat of seats) {
    if (!seat.plusOneOf) continue
    const indexes = indexesByMember.get(seat.plusOneOf) ?? []
    indexes.push(seat.seatIndex)
    indexesByMember.set(seat.plusOneOf, indexes)
  }

  const names = new Map<number, string>()
  for (const [memberId, indexes] of indexesByMember) {
    const firstName = firstNameFor(memberId)
    ;[...indexes]
      .sort((a, b) => a - b)
      .forEach((seatIndex, position) => {
        names.set(seatIndex, plusOneSeatLabel(firstName, position + 1))
      })
  }
  return names
}
