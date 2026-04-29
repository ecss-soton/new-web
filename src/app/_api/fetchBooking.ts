import { GRAPHQL_API_URL } from './shared'

const API_URL = GRAPHQL_API_URL

export interface BookingTable {
  id: string
  joinCode: string
  locked: boolean
  isOwner: boolean
  members: Array<{ id: string; name: string }>
  memberCount: number
  seatPositions?: Array<{ seatIndex: number; name: string }> | null
}

export interface BookingEventData {
  id: string
  name: string
  slug?: string | null
  isOpen?: boolean | null
  maxTables?: number | null
  seatsPerTable?: number | null
}

export async function fetchBookingData(
  eventId: string,
  args?: { token?: string },
): Promise<{
  yourTable: BookingTable | null
  event: BookingEventData
  tables: BookingTable[]
  isAdmin: boolean
}> {
  const res = await fetch(`${API_URL}/api/tables?event=${eventId}`, {
    headers: {
      ...(args?.token ? { Authorization: `JWT ${args.token}` } : {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Error fetching tables: ${res.statusText}`)
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error)
  }
  return res.json()
}

export async function joinTable(
  joinCode: string,
  token: string,
): Promise<{ success: boolean; table: { id: string; joinCode: string } }> {
  const res = await fetch(`${API_URL}/api/tables/${joinCode}/join`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error)
  }
  return res.json()
}

export async function leaveTable(joinCode: string, token: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${joinCode}/leave`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error)
  }
  return res.json()
}

export async function toggleTableLock(
  joinCode: string,
  token: string,
): Promise<{ success: boolean; locked: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${joinCode}/lock`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error)
  }
  return res.json()
}

export async function fetchTableSeats(
  joinCode: string,
  token: string,
): Promise<{
  seats: Array<string | null>
  members: Array<{ id: string; name: string }>
  yourTable: boolean
  joinCode: string
  eventSlug: string
}> {
  const res = await fetch(`${API_URL}/api/tables/${joinCode}/seats`, {
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Error fetching seats: ${res.statusText}`)
  return res.json()
}

export async function updateSeats(
  joinCode: string,
  seatPositions: Array<{ seatIndex: number; name: string }>,
  token: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/tables/${joinCode}/seats`, {
    method: 'PATCH',
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seatPositions }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error)
  }
  return res.json()
}
