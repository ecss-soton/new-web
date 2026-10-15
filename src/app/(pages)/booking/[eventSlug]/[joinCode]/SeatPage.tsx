'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { User } from '../../../../../payload/payload-types'
import type { SeatAssignment, TableSeatData } from '../../../../_api/fetchBooking'
import { fetchTableSeats, joinTable, updateSeats } from '../../../../_api/fetchBooking'
import { SeatLayout } from '../../../../_components/SeatLayout'

export const SeatPage: React.FC<{
  joinCode: string
  eventSlug: string
  user: User
  token: string
}> = ({ joinCode, eventSlug, user, token }) => {
  const [data, setData] = useState<TableSeatData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const seatRequestRef = useRef(0)

  const loadSeats = useCallback(async () => {
    const requestId = ++seatRequestRef.current
    try {
      const result = await fetchTableSeats(joinCode, token)
      if (requestId !== seatRequestRef.current) return
      setData(result)
    } catch (err) {
      if (requestId !== seatRequestRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load seats')
    } finally {
      if (requestId === seatRequestRef.current) {
        setLoading(false)
      }
    }
  }, [joinCode, token])

  useEffect(() => {
    loadSeats()
    const interval = setInterval(loadSeats, 5000)
    return () => clearInterval(interval)
  }, [loadSeats])

  const handleSave = async (seatPositions: SeatAssignment[]) => {
    await updateSeats(joinCode, seatPositions, token)
    await loadSeats()
  }

  const handleJoin = async () => {
    setJoining(true)
    setError(null)
    try {
      await joinTable(joinCode, token)
      await loadSeats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join table')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="status-screen">
          <p>Loading seat plan...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page-container">
        <div className="status-screen">
          <p style={{ color: 'var(--color-error-400)' }}>{error}</p>
          <p>
            <a href={`/booking/${eventSlug}`} style={{ color: 'var(--color-base-400)' }}>
              &#8592; Back to Tables
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page-container">
        <div className="status-screen">
          <p>Table not found. Check the link and try again.</p>
        </div>
      </div>
    )
  }

  const joinBlockedReason = data.full
    ? 'This table is full.'
    : data.locked
    ? 'This table is locked.'
    : !data.bookingOpen
    ? 'Booking is currently closed.'
    : 'You need to be on the guest list to join this table.'

  return (
    <div className="page-container">
      {error && (
        <div
          style={{
            maxWidth: 900,
            margin: '1rem auto 0',
            background: 'var(--color-error-900)',
            color: 'var(--color-error-200)',
            padding: '0.75rem 1rem',
            borderRadius: 8,
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

      <SeatLayout
        seats={data.seats}
        members={data.members}
        currentUserId={user?.id}
        joinCode={data.joinCode}
        eventSlug={data.eventSlug || eventSlug}
        isMember={data.isMember}
        canEdit={data.isMember && (!data.locked || data.isAdmin)}
        locked={data.locked}
        canJoin={data.canJoin}
        onJoin={handleJoin}
        joining={joining}
        joinBlockedReason={joinBlockedReason}
        onSave={handleSave}
      />
    </div>
  )
}
