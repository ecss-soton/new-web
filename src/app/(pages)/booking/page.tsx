import React from 'react'
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { fetchBookingEvents } from '../../_api/fetchEvents'
import { getMeUser } from '../../_utilities/getMeUser'

export const metadata: Metadata = {
  title: 'Table Booking | ECSS',
  description: 'Book your table for an event',
}

export default async function BookingHome() {
  await getMeUser({
    nullUserRedirect: `/login?redirect=/booking`,
  })

  const token = cookies().get('payload-token')?.value
  let events: Array<{
    id: string
    name: string
    slug?: string | null
    date?: string | null
    isOpen?: boolean | null
  }> = []
  try {
    events = await fetchBookingEvents({ token })
  } catch {
    // fall through to render empty state
  }

  if (events.length === 1) {
    const evt = events[0]
    redirect(`/booking/${evt.slug || evt.id}`)
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Table Booking</h1>

        {events.length === 0 && (
          <p style={{ color: 'var(--color-base-500)' }}>
            No events available yet. Check back soon!
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {events.map(evt => (
            <a
              key={evt.id}
              href={`/booking/${evt.slug || evt.id}`}
              style={{
                background: 'var(--color-base-900)',
                border: '1px solid var(--color-base-800)',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.15s',
              }}
            >
              <div>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 600 }}>
                  {evt.name}
                </h2>
                {evt.date && (
                  <span style={{ color: 'var(--color-base-500)', fontSize: '0.85rem' }}>
                    {new Date(evt.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <span
                style={{
                  background: evt.isOpen ? 'var(--color-success-900)' : 'var(--color-base-800)',
                  color: evt.isOpen ? 'var(--color-success-300)' : 'var(--color-base-400)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                {evt.isOpen ? 'Open' : 'Closed'}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
