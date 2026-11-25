import type { SeatAssignment, SeatSlot } from '../../utilities/booking/seats'
import type { TableNameMode } from '../../utilities/booking/tableName'
import { GRAPHQL_API_URL } from './shared'

export type { SeatAssignment, SeatSlot }

const API_URL = GRAPHQL_API_URL

export interface BookingTable {
  id: string
  joinCode: string
  /** Human-readable name: the owner's first name or the join code. */
  name?: string
  /** Derived 1..N creation-order number; shown on cards and matched by the export. */
  number?: number
  locked: boolean
  isOwner: boolean
  members: Array<{ id: string; name: string }>
  memberCount: number
}

/** The viewer's own table, with their seat on it. */
export interface YourTable {
  id: string
  joinCode: string
  name?: string
  number?: number
  /** 1-based seat number, or null when the viewer has not picked one. */
  yourSeat?: number | null
  locked: boolean
  isOwner: boolean
  memberCount: number
}

export interface BookingEventData {
  id: string
  name: string
  slug?: string | null
  /** CMS copy shown in place of the default booking-open message. */
  description?: string | null
  isOpen?: boolean | null
  maxTables?: number | null
  seatsPerTable?: number | null
}

export interface TableMember {
  id: string
  name: string
  /** From the event guest list; how many plus-one seats this member may place. */
  plusOneCount: number
}

export interface TableSeatData {
  seats: SeatSlot[]
  members: TableMember[]
  isMember: boolean
  /** The viewer owns the table, so they may rearrange every seat. */
  isOwner: boolean
  isAdmin: boolean
  locked: boolean
  full: boolean
  bookingOpen: boolean
  canJoin: boolean
  joinCode: string
  /** Human-readable table name shown instead of the join code. */
  name: string
  /** Derived 1..N creation-order table number, matching the seat-plan export. */
  tableNumber?: number | null
  nameMode: TableNameMode
  eventSlug: string
}

/**
 * Payload answers validation failures from collection hooks with
 * `{ errors: [{ message }] }` and endpoint guards with `{ error }`; both need
 * surfacing so a rejected join/leave doesn't look like a crash.
 */
export const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  const json = (await res.json().catch(() => null)) as {
    error?: string
    errors?: Array<{ message?: string }>
  } | null

  return json?.error || json?.errors?.[0]?.message || fallback
}

const authHeaders = (token?: string): Record<string, string> =>
  token ? { Authorization: `JWT ${token}` } : {}

export async function fetchBookingData(
  eventId: string,
  args?: { token?: string },
): Promise<{
  yourTable: YourTable | null
  event: BookingEventData
  tables: BookingTable[]
  isAdmin: boolean
}> {
  const res = await fetch(`${API_URL}/api/tables?event=${encodeURIComponent(eventId)}`, {
    headers: authHeaders(args?.token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load tables'))
  return res.json()
}

export async function createTable(
  eventId: string,
  token: string,
): Promise<{ success: boolean; table: { id: string; joinCode: string } }> {
  const res = await fetch(`${API_URL}/api/tables/create`, {
    method: 'POST',
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to create table'))
  return res.json()
}

export async function deleteTable(joinCode: string, token: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/delete`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to delete table'))
  return res.json()
}

export async function removeTableMember(
  joinCode: string,
  userId: string,
  token: string,
): Promise<{ success: boolean; tableDeleted?: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/remove-member`, {
    method: 'POST',
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to remove that guest'))
  return res.json()
}

export async function joinTable(
  joinCode: string,
  token: string,
): Promise<{ success: boolean; table: { id: string; joinCode: string } }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/join`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to join table'))
  return res.json()
}

export async function leaveTable(joinCode: string, token: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/leave`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to leave table'))
  return res.json()
}

export async function toggleTableLock(
  joinCode: string,
  token: string,
): Promise<{ success: boolean; locked: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/lock`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to toggle lock'))
  return res.json()
}

export async function fetchTableSeats(joinCode: string, token: string): Promise<TableSeatData> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/seats`, {
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load seats'))
  return res.json()
}

export async function updateSeats(
  joinCode: string,
  seatPositions: SeatAssignment[],
  token: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/seats`, {
    method: 'PATCH',
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seatPositions }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to save seats'))
  return res.json()
}

export async function setTableNameMode(
  joinCode: string,
  nameMode: TableNameMode,
  token: string,
): Promise<{ success: boolean; nameMode: TableNameMode; name: string }> {
  const res = await fetch(`${API_URL}/api/tables/${encodeURIComponent(joinCode)}/name`, {
    method: 'PATCH',
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nameMode }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to change the table name'))
  return res.json()
}
