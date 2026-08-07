'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { User } from '../../../../../payload/payload-types'
import { fetchTableSeats, updateSeats } from '../../../../_api/fetchBooking'
import { SeatLayout } from '../../../../_components/SeatLayout'

type SeatData = Awaited<ReturnType<typeof fetchTableSeats>>

export const SeatPage: React.FC<{
  joinCode: string
  eventSlug: string
  user: User
  token: string
}> = ({ joinCode, eventSlug, user, token }) => {
  const [data, setData] = useState<SeatData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

  const handleSave = async (seatPositions: Array<{ seatIndex: number; name: string }>) => {
    await updateSeats(joinCode, seatPositions, token)
    await loadSeats()
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Loading seat plan...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--color-error-400)' }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page-container">
        <p>Table not found. Check the link and try again.</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      <SeatLayout
        seats={data.seats}
        members={data.members}
        yourTable={data.yourTable}
        joinCode={data.joinCode}
        eventSlug={eventSlug}
        onSave={handleSave}
      />
    </div>
  )
}
