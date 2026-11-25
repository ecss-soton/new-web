'use client'

import React, { useState } from 'react'
import Link from 'next/link'

import classes from './index.module.scss'

type TableCardProps = {
  joinCode: string
  /** Human-readable table name (owner's first name or the join code). */
  name?: string
  /** Derived 1..N table number; omitted for admin-visible empty tables. */
  number?: number
  locked: boolean
  isOwner: boolean
  members: { id: string; name: string }[]
  memberCount: number
  seatsPerTable: number
  isYourTable: boolean
  isAdmin: boolean
  bookingOpen: boolean
  eventSlug?: string
  onJoin?: () => void
  onLeave?: () => void
  onToggleLock?: () => void
  /** Admin only: delete the table and its seating. */
  onDelete?: () => void
  loading?: boolean
}

export const TableCard: React.FC<TableCardProps> = ({
  joinCode,
  name,
  number,
  locked,
  isOwner,
  members,
  memberCount,
  seatsPerTable,
  isYourTable,
  isAdmin,
  bookingOpen,
  eventSlug,
  onJoin,
  onLeave,
  onToggleLock,
  onDelete,
  loading,
}) => {
  const [copied, setCopied] = useState(false)

  const capacity = seatsPerTable
  const currentSeats = memberCount || 0
  const full = currentSeats >= capacity
  const canJoin = !full && !locked && (bookingOpen || isAdmin)
  // The lock is the owner's freeze control: it stops joins, leaves and seat edits.
  const canLeave = (bookingOpen || isAdmin) && (!locked || isAdmin)
  // Owners freeze their own table; admins can freeze (or rescue) any table.
  const canToggleLock = isOwner || isAdmin
  const plusOneSeats = Math.max(0, currentSeats - members.length)

  const shareLink = `${process.env.NEXT_PUBLIC_SERVER_URL}/booking/${eventSlug || ''}/${joinCode}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div
      className={[classes.tableCard, isYourTable ? classes.yourTable : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={classes.header}>
        <div className={classes.titleBlock}>
          {number !== undefined && <span className={classes.tableNumber}>Table {number}</span>}
          <h3 className={classes.code}>
            {name || `Table ${joinCode}`}
            {locked && <span className={classes.lockIcon}> 🔒</span>}
          </h3>
        </div>
        <span className={classes.capacity}>
          {currentSeats}/{capacity} seats reserved
          {plusOneSeats > 0 ? ` (${members.length} + ${plusOneSeats} plus-ones)` : ''}
        </span>
      </div>

      {members.length > 0 && (
        <ul className={classes.memberList}>
          {members.map(member => (
            <li key={member.id} className={classes.member}>
              {member.name}
            </li>
          ))}
        </ul>
      )}

      {members.length === 0 && <p className={classes.empty}>No members yet</p>}

      <div className={classes.actions}>
        {isYourTable ? (
          <>
            <Link href={`/booking/${eventSlug || ''}/${joinCode}`} className={classes.button}>
              Seat Plan
            </Link>
            <button
              className={[classes.button, classes.secondary].join(' ')}
              onClick={onLeave}
              disabled={loading || !canLeave}
              title={!canLeave && locked ? 'Unlock the table to leave' : undefined}
            >
              {loading ? 'Leaving...' : 'Leave'}
            </button>
            {canToggleLock && (
              <button
                className={[classes.button, classes.secondary].join(' ')}
                onClick={onToggleLock}
                disabled={loading}
              >
                {loading ? '...' : locked ? 'Unlock' : 'Lock'}
              </button>
            )}
            {isAdmin && (
              <button
                className={[classes.button, classes.danger].join(' ')}
                onClick={onDelete}
                disabled={loading}
                title="Delete this table and its seating"
              >
                Delete
              </button>
            )}
          </>
        ) : (
          <>
            {isAdmin && (
              <Link
                href={`/booking/${eventSlug || ''}/${joinCode}`}
                className={[classes.button, classes.secondary].join(' ')}
                title="View the seating plan without joining this table"
              >
                View seat plan
              </Link>
            )}
            {canJoin && (
              <button className={classes.button} onClick={onJoin} disabled={loading}>
                {loading ? 'Joining...' : 'Join Table'}
              </button>
            )}
            {isAdmin && (
              <button
                className={[classes.button, classes.secondary].join(' ')}
                onClick={onToggleLock}
                disabled={loading}
              >
                {loading ? '...' : locked ? 'Unlock' : 'Lock'}
              </button>
            )}
            {isAdmin && (
              <button
                className={[classes.button, classes.danger].join(' ')}
                onClick={onDelete}
                disabled={loading}
                title="Delete this table and its seating"
              >
                Delete
              </button>
            )}
            {full && !isYourTable && <span className={classes.fullLabel}>Full</span>}
            {locked && !isYourTable && !isAdmin && (
              <span className={classes.fullLabel}>Locked</span>
            )}
            {!bookingOpen && !isAdmin && !isYourTable && (
              <span className={classes.fullLabel}>Closed</span>
            )}
          </>
        )}

        <button className={[classes.button, classes.copyBtn].join(' ')} onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}
