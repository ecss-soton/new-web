import type { BookingEvent } from '../../payload/payload-types'
import { GRAPHQL_API_URL } from './shared'

const API_URL = GRAPHQL_API_URL

export async function fetchBookingEvents(args?: { token?: string }): Promise<BookingEvent[]> {
  const res = await fetch(`${API_URL}/api/booking-events?depth=0`, {
    headers: {
      ...(args?.token ? { Authorization: `JWT ${args.token}` } : {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Error fetching events: ${res.statusText}`)
  const json = await res.json()
  return json.docs || []
}
