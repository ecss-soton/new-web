'use client'

import React, { useCallback, useEffect, useState } from 'react'

import type { SeatAssignment } from '../../_api/fetchBooking'

import classes from './index.module.scss'

export type SeatSlot = { userId: string | null; name: string } | null

type SeatLayoutProps = {
  seats: SeatSlot[]
  members: { id: string; name: string }[]
  joinCode: string
  eventSlug: string
  onSave: (seats: SeatAssignment[]) => Promise<void>
  /** Used to flag the viewer's own name in the guest picker. */
  currentUserId?: string
  /** A member of this table, so the plan is theirs to arrange. */
  isMember: boolean
  /** Members can edit only while the owner's lock is off. */
  canEdit: boolean
  locked: boolean
  /** Signed in but not at this table yet. */
  canJoin: boolean
  onJoin?: () => void
  joining?: boolean
  /** Why joining is unavailable, when it is. */
  joinBlockedReason?: string | null
}

const TABLE_RADIUS = 140 // px
const SEAT_SIZE = 100 // px

export const SeatLayout: React.FC<SeatLayoutProps> = ({
  seats,
  members,
  joinCode,
  eventSlug,
  onSave,
  currentUserId,
  isMember,
  canEdit,
  locked,
  canJoin,
  onJoin,
  joining,
  joinBlockedReason,
}) => {
  const [editingSeat, setEditingSeat] = useState<number | null>(null)
  const [localSeats, setLocalSeats] = useState<SeatSlot[]>(seats)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // The page polls every few seconds. Adopt server changes unless the viewer has
  // unsaved edits, so another member's update appears without clobbering theirs.
  useEffect(() => {
    if (!dirty) {
      setLocalSeats(seats)
    }
  }, [seats, dirty])

  const getSeatPosition = useCallback((index: number, total: number) => {
    const angle = (360 / total) * index - 90
    const radian = (angle * Math.PI) / 180
    const x = TABLE_RADIUS * Math.cos(radian)
    const y = TABLE_RADIUS * Math.sin(radian)
    return { x, y, angle }
  }, [])

  const isSeated = useCallback(
    (member: { id: string; name: string }): boolean =>
      localSeats.some(
        seat =>
          seat !== null &&
          (seat.userId !== null ? seat.userId === member.id : seat.name === member.name),
      ),
    [localSeats],
  )

  const unassigned = members.filter(member => !isSeated(member))

  const handleSeatClick = (index: number) => {
    if (!canEdit) return
    setEditingSeat(current => (current === index ? null : index))
  }

  const handleAssign = (index: number, member: { id: string; name: string }) => {
    setLocalSeats(current => {
      const updated = [...current]
      // Clear this guest from any other seat they occupy.
      for (let i = 0; i < updated.length; i++) {
        const seat = updated[i]
        if (seat && (seat.userId === member.id || seat.name === member.name)) {
          updated[i] = null
        }
      }
      updated[index] = { userId: member.id, name: member.name }
      return updated
    })
    setDirty(true)
    setEditingSeat(null)
  }

  const handleClear = (index: number) => {
    setLocalSeats(current => {
      const updated = [...current]
      updated[index] = null
      return updated
    })
    setDirty(true)
    setEditingSeat(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const seatPositions: SeatAssignment[] = []
      localSeats.forEach((seat, index) => {
        if (!seat) return
        // Rows written before seats were keyed by user still carry a name only.
        seatPositions.push(
          seat.userId
            ? { seatIndex: index, userId: seat.userId }
            : { seatIndex: index, name: seat.name },
        )
      })

      await onSave(seatPositions)
      setDirty(false)
      setMessage({ type: 'success', text: 'Seats saved!' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const seatCount = seats.length

  return (
    <div className={classes.container}>
      <div className={classes.topBar}>
        <a href={`/booking/${eventSlug}`} className={classes.backBtn}>
          &#8592; Back to Tables
        </a>
      </div>
      <h2 className={classes.title}>Table {joinCode} - Seat Plan</h2>

      <div className={classes.statusNotice}>
        {isMember ? (
          locked ? (
            <span>🔒 This table is locked. The owner can unlock it to make changes.</span>
          ) : (
            <span>You&apos;re at this table. Click a seat to assign a guest.</span>
          )
        ) : canJoin ? (
          <span className={classes.joinRow}>
            <span>This table has space — join it to take a seat.</span>
            <button className={classes.saveBtn} onClick={onJoin} disabled={joining}>
              {joining ? 'Joining...' : 'Join Table'}
            </button>
          </span>
        ) : (
          <span>{joinBlockedReason || 'You cannot join this table.'}</span>
        )}
      </div>

      <div className={classes.tableContainer}>
        <div className={classes.table}>
          <div className={classes.tableInner}>
            <span className={classes.tableLabel}>Table</span>
            <span className={classes.tableCode}>{joinCode}</span>
          </div>

          {localSeats.map((seat, index) => {
            const pos = getSeatPosition(index, seatCount)
            const isEditing = editingSeat === index
            const isOccupied = seat !== null

            return (
              <div
                key={index}
                className={[
                  classes.seat,
                  isOccupied ? classes.occupied : classes.free,
                  isEditing ? classes.editing : '',
                ].join(' ')}
                style={{
                  left: `calc(50% + ${pos.x}px - ${SEAT_SIZE / 2}px)`,
                  top: `calc(50% + ${pos.y}px - ${SEAT_SIZE / 2}px)`,
                  transform: `rotate(${pos.angle + 90}deg)`,
                  zIndex: isEditing ? 10 : undefined,
                }}
                onClick={() => handleSeatClick(index)}
              >
                <div
                  className={classes.seatInner}
                  style={{ transform: `rotate(-${pos.angle + 90}deg)` }}
                >
                  <span className={classes.seatIndex}>#{index + 1}</span>
                  {isOccupied ? (
                    <span className={classes.seatName}>{seat?.name}</span>
                  ) : (
                    <span className={classes.seatFree}>Free</span>
                  )}
                </div>

                {isEditing && canEdit && (
                  <div
                    className={classes.seatEditor}
                    style={{ transform: `rotate(-${pos.angle + 90}deg)` }}
                  >
                    <div className={classes.editorInner}>
                      <span className={classes.editorLabel}>Assign seat #{index + 1}</span>
                      <div className={classes.editorOptions}>
                        {members.map(m => (
                          <button
                            key={m.id}
                            className={classes.assignBtn}
                            onClick={() => handleAssign(index, m)}
                          >
                            {m.name}
                            {m.id === currentUserId ? ' (you)' : ''}
                          </button>
                        ))}
                        {isOccupied && (
                          <button
                            className={[classes.assignBtn, classes.clearBtn].join(' ')}
                            onClick={() => handleClear(index)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <button className={classes.cancelBtn} onClick={() => setEditingSeat(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {unassigned.length > 0 && isMember && (
        <div className={classes.unassigned}>
          <h4>Not yet seated:</h4>
          <div className={classes.unassignedList}>
            {unassigned.map(m => (
              <span key={m.id} className={classes.unassignedName}>
                {m.name}
                {m.id === currentUserId ? ' (you)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div className={classes.saveRow}>
          {message && (
            <span className={message.type === 'success' ? classes.successMsg : classes.errorMsg}>
              {message.text}
            </span>
          )}
          <button className={classes.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Seats'}
          </button>
        </div>
      )}
    </div>
  )
}
