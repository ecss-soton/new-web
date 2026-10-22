import { GRAPHQL_API_URL } from './shared'

const API_URL = GRAPHQL_API_URL

export interface BookingTable {
  id: string
  joinCode: string
  locked: boolean
  isOwner: boolean
  members: Array<{ id: string; name: string }>
  memberCount: number
  seatPositions?: Array<{ seatIndex: number; userId?: string | null; name: string }> | null
}

export interface BookingEventData {
  id: string
  name: string
  slug?: string | null
  isOpen?: boolean | null
  maxTables?: number | null
  seatsPerTable?: number | null
}

export interface SeatAssignment {
  seatIndex: number
  userId?: string
  name?: string
}

export interface TableSeatData {
  seats: Array<{ userId: string | null; name: string } | null>
  members: Array<{ id: string; name: string }>
  yourTable: boolean
  isMember: boolean
  /** The viewer owns the table, so they may rearrange every seat. */
  isOwner: boolean
  isAdmin: boolean
  locked: boolean
  full: boolean
  bookingOpen: boolean
  canJoin: boolean
  joinCode: string
  eventSlug: string
  seatsPerTable: number
  memberCount: number
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
  yourTable: BookingTable | null
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
