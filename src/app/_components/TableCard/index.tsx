'use client'

import React, { useState } from 'react'
import Link from 'next/link'

import classes from './index.module.scss'

type TableCardProps = {
  id: string
  joinCode: string
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
  loading?: boolean
}

export const TableCard: React.FC<TableCardProps> = ({
  id,
  joinCode,
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
  loading,
}) => {
  const [copied, setCopied] = useState(false)

  const capacity = seatsPerTable
  const currentSeats = memberCount || 0
  const full = currentSeats >= capacity
  const canJoin = !full && !locked && (bookingOpen || isAdmin)

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
        <h3 className={classes.code}>
          Table {joinCode}
          {locked && <span className={classes.lockIcon}> 🔒</span>}
        </h3>
        <span className={classes.capacity}>
          {currentSeats}/{capacity} seats
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
              disabled={loading || !(bookingOpen || isAdmin)}
            >
              {loading ? 'Leaving...' : 'Leave'}
            </button>
            {isOwner && (
              <button
                className={[classes.button, classes.secondary].join(' ')}
                onClick={onToggleLock}
                disabled={loading}
              >
                {loading ? '...' : locked ? 'Unlock' : 'Lock'}
              </button>
            )}
          </>
        ) : (
          <>
            {canJoin && (
              <button className={classes.button} onClick={onJoin} disabled={loading}>
                {loading ? 'Joining...' : 'Join Table'}
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
