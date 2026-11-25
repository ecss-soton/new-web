'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { User } from '../../../../../payload/payload-types'
import type { TableNameMode } from '../../../../../utilities/booking/tableName'
import type { SeatAssignment, TableMember, TableSeatData } from '../../../../_api/fetchBooking'
import {
  deleteTable,
  fetchTableSeats,
  joinTable,
  removeTableMember,
  setTableNameMode,
  toggleTableLock,
  updateSeats,
} from '../../../../_api/fetchBooking'
import { SeatAdminControls } from '../../../../_components/SeatAdminControls'
import { SeatLayout } from '../../../../_components/SeatLayout'

export const SeatPage: React.FC<{
  joinCode: string
  eventSlug: string
  user: User
  token: string
}> = ({ joinCode, eventSlug, user, token }) => {
  const router = useRouter()
  const [data, setData] = useState<TableSeatData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [adminAction, setAdminAction] = useState<'lock' | 'delete' | null>(null)
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

  const handleRename = async (nameMode: TableNameMode) => {
    await setTableNameMode(joinCode, nameMode, token)
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

  const tableLabel = data
    ? data.tableNumber !== null && data.tableNumber !== undefined
      ? `Table ${data.tableNumber}`
      : data.name
    : 'this table'

  const handleRemoveMember = async (member: TableMember) => {
    if (!data || removingMemberId || adminAction) return

    const confirmed = window.confirm(
      `Remove ${member.name} from ${tableLabel}? Their seat and any plus-one seats will be cleared.`,
    )
    if (!confirmed) return

    setRemovingMemberId(member.id)
    setError(null)

    try {
      const result = await removeTableMember(joinCode, member.id, token)
      if (result.tableDeleted) {
        router.push(`/booking/${data.eventSlug || eventSlug}`)
        return
      }
      await loadSeats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove that guest')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleToggleLock = async () => {
    if (!data || adminAction || removingMemberId) return

    setAdminAction('lock')
    setError(null)

    try {
      await toggleTableLock(joinCode, token)
      await loadSeats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change the lock')
    } finally {
      setAdminAction(null)
    }
  }

  const handleDeleteTable = async () => {
    if (!data || adminAction || removingMemberId) return

    const confirmed = window.confirm(
      `Delete ${tableLabel}? Its seating will be removed and this cannot be undone.`,
    )
    if (!confirmed) return

    setAdminAction('delete')
    setError(null)

    try {
      await deleteTable(joinCode, token)
      router.push(`/booking/${data.eventSlug || eventSlug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table')
      setAdminAction(null)
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

      {data.isAdmin && (
        <SeatAdminControls
          members={data.members}
          locked={data.locked}
          onRemoveMember={handleRemoveMember}
          onToggleLock={handleToggleLock}
          onDeleteTable={handleDeleteTable}
          removingMemberId={removingMemberId}
          busyAction={adminAction}
        />
      )}

      <SeatLayout
        seats={data.seats}
        members={data.members}
        currentUserId={user?.id}
        joinCode={data.joinCode}
        name={data.name}
        tableNumber={data.tableNumber ?? null}
        nameMode={data.nameMode}
        onRename={handleRename}
        eventSlug={data.eventSlug || eventSlug}
        isAdmin={data.isAdmin}
        isMember={data.isMember}
        isOwner={data.isOwner}
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
