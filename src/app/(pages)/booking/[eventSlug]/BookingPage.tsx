'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { User } from '../../../../payload/payload-types'
import type { BookingEventData, BookingTable } from '../../../_api/fetchBooking'
import {
  createTable,
  fetchBookingData,
  joinTable,
  leaveTable,
  toggleTableLock,
} from '../../../_api/fetchBooking'
import { TableCard } from '../../../_components/TableCard'

type BookingState = {
  yourTable: BookingTable | null
  event: BookingEventData
  tables: BookingTable[]
  isAdmin: boolean
}

export const BookingPage: React.FC<{ user: User; token: string; eventSlug: string }> = ({
  user,
  token,
  eventSlug,
}) => {
  const router = useRouter()
  const [data, setData] = useState<BookingState | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // First, resolve eventSlug to eventId via the API
  useEffect(() => {
    const resolveEvent = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/booking-events?where[slug][equals]=${eventSlug}&depth=0`,
          { headers: { Authorization: `JWT ${token}` }, cache: 'no-store' },
        )
        const json = await res.json()
        if (json.docs?.length > 0) {
          setEventId(json.docs[0].id)
        } else {
          setError('Event not found')
          setLoading(false)
        }
      } catch {
        setError('Failed to load event')
        setLoading(false)
      }
    }
    resolveEvent()
  }, [eventSlug, token])

  const loadData = useCallback(async () => {
    if (!eventId) return
    try {
      const result = await fetchBookingData(eventId, { token })
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking data')
    } finally {
      setLoading(false)
    }
  }, [eventId, token])

  useEffect(() => {
    if (eventId) {
      loadData()
      const interval = setInterval(loadData, 5000)
      return () => clearInterval(interval)
    }
  }, [eventId, loadData])

  const handleCreate = async () => {
    if (!eventId) return
    setActionLoading('create')
    try {
      const result = await createTable(eventId, token)
      router.push(`/booking/${eventSlug}/${result.table.joinCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table')
    } finally {
      setActionLoading(null)
    }
  }

  const handleJoin = async (joinCode: string) => {
    setActionLoading(joinCode)
    try {
      await joinTable(joinCode, token)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join table')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeave = async (joinCode: string) => {
    setActionLoading(joinCode)
    try {
      await leaveTable(joinCode, token)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave table')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleLock = async (joinCode: string) => {
    setActionLoading(joinCode)
    try {
      await toggleTableLock(joinCode, token)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle lock')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Loading booking system...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--color-error-400)' }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page-container">
        <p>Unable to load booking data. Please try again later.</p>
      </div>
    )
  }

  const { yourTable, event, tables, isAdmin } = data
  const bookingOpen = event?.isOpen || isAdmin

  return (
    <div className="page-container">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <a
            href="/booking"
            style={{
              color: 'var(--color-base-400)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            &#8592; All Events
          </a>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {event?.name || 'Table Booking'}
          </h1>
          <p style={{ color: 'var(--color-base-400)' }}>
            {event?.isOpen
              ? 'Booking is open — create or join a table!'
              : 'Booking is currently closed.'}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--color-error-900)',
              color: 'var(--color-error-200)',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1rem',
            }}
          >
            {error}
            <button
              style={{
                marginLeft: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-error-300)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {yourTable && (
          <div
            style={{
              background: 'var(--color-base-900)',
              border: '1px solid var(--color-success-600)',
              borderRadius: 12,
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Your Table: {yourTable.joinCode}
              {yourTable.locked && ' 🔒'}
            </h2>
            <p style={{ color: 'var(--color-base-400)', margin: 0 }}>
              {yourTable.memberCount} seats reserved
              {yourTable.isOwner ? ' — You are the table owner' : ''}
            </p>
          </div>
        )}

        {!yourTable && bookingOpen && (
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={handleCreate}
              disabled={actionLoading === 'create'}
              style={{
                background: 'var(--color-base-200)',
                color: 'var(--color-base-950)',
                border: 'none',
                borderRadius: 10,
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: actionLoading === 'create' ? 0.5 : 1,
              }}
            >
              {actionLoading === 'create' ? 'Creating...' : '+ Create New Table'}
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {tables.map(table => (
            <TableCard
              key={table.joinCode}
              id={table.joinCode}
              joinCode={table.joinCode}
              locked={table.locked}
              isOwner={table.isOwner}
              members={table.members}
              memberCount={table.memberCount}
              seatsPerTable={event?.seatsPerTable || 10}
              isYourTable={yourTable?.joinCode === table.joinCode}
              isAdmin={isAdmin}
              bookingOpen={event?.isOpen || isAdmin}
              eventSlug={eventSlug}
              onJoin={() => handleJoin(table.joinCode)}
              onLeave={() => handleLeave(table.joinCode)}
              onToggleLock={() => handleToggleLock(table.joinCode)}
              loading={actionLoading === table.joinCode}
            />
          ))}

          {tables.length === 0 && (
            <p
              style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-base-500)' }}
            >
              No tables yet. Create one to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
