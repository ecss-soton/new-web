'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type { SeatAssignment } from '../../_api/fetchBooking'

import classes from './index.module.scss'

export type SeatSlot = { userId: string | null; name: string } | null

type SeatLayoutProps = {
  seats: SeatSlot[]
  members: { id: string; name: string }[]
  joinCode: string
  eventSlug: string
  onSave: (seats: SeatAssignment[]) => Promise<void>
  /** Used to flag the viewer's own name and to restrict which seats they may move. */
  currentUserId?: string
  /** A member of this table, so the plan is theirs to arrange. */
  isMember: boolean
  /** Members can edit only while the owner's lock is off. */
  canEdit: boolean
  /** Owner or admin: may rearrange every seat. Everyone else may only move their own. */
  canManageAll: boolean
  locked: boolean
  /** Signed in but not at this table yet. */
  canJoin: boolean
  onJoin?: () => void
  joining?: boolean
  /** Why joining is unavailable, when it is. */
  joinBlockedReason?: string | null
}

// All seat geometry is expressed as a percentage of the square table box, so the
// whole ring scales with the container instead of overflowing on small screens.
// Keeping the gaps proportional also means seats never overlap, whatever
// `seatsPerTable` is set to (2–20).
const SEAT_GAP = 2

/** Largest diameter that fits N seats in a non-overlapping ring inside the box. */
const diameterFor = (count: number): number => {
  const seats = Math.max(count, 1)
  const solved = (100 * Math.PI - seats * SEAT_GAP) / (seats + Math.PI)
  return Math.min(34, solved)
}

const isMySeat = (seat: SeatSlot, userId?: string, userName?: string): boolean => {
  if (!seat) return false
  if (seat.userId) return seat.userId === userId
  return Boolean(userName) && seat.name === userName
}

export const SeatLayout: React.FC<SeatLayoutProps> = ({
  seats,
  members,
  joinCode,
  eventSlug,
  onSave,
  currentUserId,
  isMember,
  canEdit,
  canManageAll,
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
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // The page polls every few seconds. Adopt server changes unless the viewer has
  // unsaved edits, so another member's update appears without clobbering theirs.
  useEffect(() => {
    if (!dirty) {
      setLocalSeats(seats)
    }
  }, [seats, dirty])

  const myMember = useMemo(
    () => members.find(member => member.id === currentUserId),
    [members, currentUserId],
  )

  const seatCount = Math.max(localSeats.length, 1)
  const diameter = diameterFor(seatCount)
  const radius = 50 - diameter / 2
  // Font size tracks the circle so long names stay inside it at any seat count.
  const seatFont = `${(diameter * 0.15).toFixed(2)}cqw`

  const positionFor = useCallback(
    (index: number) => {
      const angle = (360 / seatCount) * index - 90
      const radian = (angle * Math.PI) / 180
      return {
        left: 50 + radius * Math.cos(radian),
        top: 50 + radius * Math.sin(radian),
      }
    },
    [radius, seatCount],
  )

  const isSeated = useCallback(
    (member: { id: string; name: string }): boolean =>
      localSeats.some(seat => seat !== null && isMySeat(seat, member.id, member.name)),
    [localSeats],
  )

  const unassigned = members.filter(member => !isSeated(member))

  // Auto-dismiss transient confirmations; errors stay put until the next action.
  useEffect(() => {
    if (!message || message.type === 'error') return
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const handleSeatClick = (index: number) => {
    if (!canEdit) return

    const seat = localSeats[index]

    // Owners and admins open the guest picker on any seat.
    if (canManageAll) {
      setEditingSeat(current => (current === index ? null : index))
      setMessage(null)
      return
    }

    // Everyone else can only ever act on their own seat.
    if (seat && !isMySeat(seat, currentUserId, myMember?.name)) {
      setEditingSeat(null)
      setMessage({ type: 'info', text: `Seat #${index + 1} is taken by ${seat.name}.` })
      return
    }

    // Clicking their own seat opens the release option; a free seat moves them there.
    if (seat) {
      setEditingSeat(current => (current === index ? null : index))
      return
    }

    if (!myMember) return
    assignSeat(index, myMember)
  }

  const assignSeat = (index: number, member: { id: string; name: string }) => {
    setLocalSeats(current => {
      const updated = [...current]
      // A guest holds one seat, so clear them from wherever they were.
      for (let i = 0; i < updated.length; i++) {
        if (isMySeat(updated[i], member.id, member.name)) {
          updated[i] = null
        }
      }
      updated[index] = { userId: member.id, name: member.name }
      return updated
    })
    setDirty(true)
    setEditingSeat(null)
    setMessage(null)
  }

  const clearSeat = (index: number) => {
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
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const editingPosition = editingSeat !== null ? positionFor(editingSeat) : null
  const editingBelow = editingPosition !== null && editingPosition.top <= 50
  // The popover is up to 46% of the box wide, so keep its centre at least 23% in
  // from either edge to stop it spilling out of the plan.
  const editingLeft = editingPosition ? Math.min(77, Math.max(23, editingPosition.left)) : null

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
          ) : canManageAll ? (
            <span>Click any seat to arrange the table.</span>
          ) : (
            <span>Click a free seat to move there, or your own seat to give it up.</span>
          )
        ) : canJoin ? (
          <span className={classes.joinRow}>
            <span>This table has space — join it to take a seat.</span>
            <button type="button" className={classes.saveBtn} onClick={onJoin} disabled={joining}>
              {joining ? 'Joining...' : 'Join Table'}
            </button>
          </span>
        ) : (
          <span>{joinBlockedReason || 'You cannot join this table.'}</span>
        )}
      </div>

      <div className={classes.legend}>
        <span className={classes.legendItem}>
          <i className={[classes.swatch, classes.swatchFree].join(' ')} /> Free
        </span>
        <span className={classes.legendItem}>
          <i className={[classes.swatch, classes.swatchTaken].join(' ')} /> Taken
        </span>
        {isMember && (
          <span className={classes.legendItem}>
            <i className={[classes.swatch, classes.swatchMine].join(' ')} /> Your seat
          </span>
        )}
      </div>

      <div className={classes.tableContainer}>
        <div className={classes.table}>
          <div className={classes.tableInner}>
            <span className={classes.tableLabel}>Table</span>
            <span className={classes.tableCode}>{joinCode}</span>
          </div>

          {localSeats.map((seat, index) => {
            const pos = positionFor(index)
            const occupied = seat !== null
            const mine = isMySeat(seat, currentUserId, myMember?.name)
            const isEditableSeat = canEdit && (canManageAll || mine || !occupied)

            return (
              <button
                type="button"
                key={index}
                className={[
                  classes.seat,
                  occupied ? classes.occupied : classes.free,
                  mine ? classes.mine : '',
                  editingSeat === index ? classes.editing : '',
                  isEditableSeat ? '' : classes.readOnly,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  width: `${diameter}%`,
                  height: `${diameter}%`,
                  fontSize: seatFont,
                }}
                onClick={() => handleSeatClick(index)}
                title={
                  occupied
                    ? `Seat #${index + 1} — ${seat?.name}${mine ? ' (you)' : ''}`
                    : `Seat #${index + 1} — free`
                }
                aria-label={`Seat #${index + 1}, ${occupied ? `taken by ${seat?.name}` : 'free'}`}
              >
                <span className={classes.seatInner}>
                  <span className={classes.seatIndex}>#{index + 1}</span>
                  {occupied ? (
                    <span className={classes.seatName}>{seat?.name}</span>
                  ) : (
                    <span className={classes.seatFree}>Free</span>
                  )}
                </span>
              </button>
            )
          })}

          {editingSeat !== null && canEdit && editingPosition && (
            <div
              className={classes.seatEditor}
              style={{
                left: `${editingLeft}%`,
                top: `${editingPosition.top}%`,
                marginTop: `${(editingBelow ? 1 : -1) * (diameter / 2 + 2)}%`,
                transform: editingBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              }}
              // Stop clicks inside the editor from reaching the seat underneath,
              // which used to reopen the menu the moment Cancel was pressed.
              onClick={event => event.stopPropagation()}
            >
              <div className={classes.editorInner}>
                <span className={classes.editorLabel}>Seat #{editingSeat + 1}</span>
                <div className={classes.editorOptions}>
                  {canManageAll &&
                    members.map(member => (
                      <button
                        type="button"
                        key={member.id}
                        className={classes.assignBtn}
                        onClick={() => assignSeat(editingSeat, member)}
                      >
                        {member.name}
                        {member.id === currentUserId ? ' (you)' : ''}
                      </button>
                    ))}
                  {isMySeat(localSeats[editingSeat], currentUserId, myMember?.name) &&
                    !canManageAll && (
                      <button
                        type="button"
                        className={[classes.assignBtn, classes.clearBtn].join(' ')}
                        onClick={() => clearSeat(editingSeat)}
                      >
                        Give up my seat
                      </button>
                    )}
                  {canManageAll && localSeats[editingSeat] && (
                    <button
                      type="button"
                      className={[classes.assignBtn, classes.clearBtn].join(' ')}
                      onClick={() => clearSeat(editingSeat)}
                    >
                      Clear seat
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={classes.cancelBtn}
                  onClick={() => setEditingSeat(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {unassigned.length > 0 && isMember && (
        <div className={classes.unassigned}>
          <h4>Not yet seated:</h4>
          <div className={classes.unassignedList}>
            {unassigned.map(member => (
              <span key={member.id} className={classes.unassignedName}>
                {member.name}
                {member.id === currentUserId ? ' (you)' : ''}
              </span>
            ))}
          </div>
          {canEdit && !canManageAll && myMember && !isSeated(myMember) && (
            <p className={classes.unassignedHint}>
              You have not picked a seat yet — click a free seat above.
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <div className={classes.saveRow}>
          {message && (
            <span
              className={
                message.type === 'success'
                  ? classes.successMsg
                  : message.type === 'error'
                  ? classes.errorMsg
                  : classes.infoMsg
              }
            >
              {message.text}
            </span>
          )}
          <button
            type="button"
            className={classes.saveBtn}
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving...' : 'Save Seats'}
          </button>
        </div>
      )}
    </div>
  )
}
